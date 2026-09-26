import { Webhook, WebhookVerificationError } from "svix"

import { BadRequestError } from "../../lib/errors.js"
import { FULL_NAME_MAX_LENGTH } from "../constants.js"

/**
 * Signature verification for Clerk webhooks.
 *
 * Clerk's own `clerkClient.webhooks.verifyEvent` does not exist in
 * @clerk/backend 3.17 (that namespace only carries `createSvixApp` /
 * `generateSvixAuthURL` / `deleteSvixApp`), so verification goes through svix
 * directly. svix 2.x is a declared dependency; if Clerk later gains
 * `verifyEvent`, this file is the only thing that needs to change.
 */

export interface VerifiedClerkEvent {
  type: string
  data: ClerkUserData
}

/** The slice of Clerk's user payload this app acts on. */
export interface ClerkUserData {
  id: string
  object?: string | null
  first_name?: string | null
  last_name?: string | null
  primary_email_address_id?: string | null
  email_addresses?: Array<{
    id: string
    email_address: string
    verification?: { status?: string | null } | null
  }> | null
  public_metadata?: Record<string, unknown> | null
}

export interface ClerkEmailMirror {
  email: string | null
  emailVerifiedAt: Date | null
}

/**
 * Caps on the fields mirrored out of a webhook and into the database.
 *
 * The signature means this data is authentic, not that it is well-formed —
 * authenticity is a property of who sent it, and Clerk still lets a caller set
 * arbitrary string lengths on a name. Without these, a single delivery could
 * write megabytes of text into `User.fullName` or `User.email`.
 */
const CLERK_ID_MAX_LENGTH = 128
const EMAIL_MAX_LENGTH = 254
const NAME_PART_MAX_LENGTH = FULL_NAME_MAX_LENGTH
const ROLE_MAX_LENGTH = 32
const MAX_MIRRORED_ADDRESSES = 20

/**
 * What a verified event asks us to do, once the payload has been checked.
 *
 * `ignore` is deliberately not an error. A signed event whose `data` is missing
 * or unusable cannot become usable on retry, so answering non-2xx would make
 * Clerk redeliver it forever — the same pathology this module already avoids
 * for unknown event types. It is dropped, logged, and reported back in the
 * response body so the condition is visible without a retry storm.
 */
export type ClerkEvent =
  | { kind: "upsert"; data: ClerkUserData }
  | { kind: "delete"; clerkUserId: string }
  | { kind: "ignore"; reason: string }

const MIRRORED_EVENTS = new Set(["user.created", "user.updated"])

/**
 * Turns a parsed payload into a decision, or into a reason to drop it.
 *
 * The important part is what this refuses to let through. `verifyClerkEvent`
 * ends in `JSON.parse(rawBody) as VerifiedClerkEvent`, which asserts a shape
 * rather than checking one, and everything downstream assumed it held:
 *
 * - `data: null` made `event.data.id` throw, turning a malformed delivery into
 *   a 500 and an unbounded retry loop.
 * - A `data` object with no `id` was worse than a crash. `syncProfileFromClerk`
 *   and `anonymiseProfile` both look a user up by `clerkUserId`, and Prisma
 *   treats `undefined` as "omit this filter" — so the query degraded into
 *   "the first user in the table" and the event was applied to whoever that
 *   happened to be. A deleted event with a missing id would have anonymised an
 *   arbitrary account.
 *
 * Both are now impossible: nothing reaches the database without a non-empty
 * string id.
 */
export function classifyClerkEvent(payload: unknown): ClerkEvent {
  if (!isRecord(payload)) {
    return { kind: "ignore", reason: "payload is not an object" }
  }

  const type = payload["type"]
  if (typeof type !== "string" || type.length === 0) {
    return { kind: "ignore", reason: "payload has no event type" }
  }

  if (!MIRRORED_EVENTS.has(type) && type !== "user.deleted") {
    return { kind: "ignore", reason: `unhandled event type "${clip(type, 64)}"` }
  }

  const data = payload["data"]
  if (!isRecord(data)) {
    return { kind: "ignore", reason: `${clip(type, 64)} carries no data object` }
  }

  const id = data["id"]
  if (typeof id !== "string" || id.trim().length === 0) {
    return { kind: "ignore", reason: `${clip(type, 64)} carries no user id` }
  }
  if (id.length > CLERK_ID_MAX_LENGTH) {
    return {
      kind: "ignore",
      reason: `user id exceeds ${CLERK_ID_MAX_LENGTH} characters`,
    }
  }

  return type === "user.deleted"
    ? { kind: "delete", clerkUserId: id }
    : { kind: "upsert", data: normaliseUserData(id, data) }
}

/**
 * Rebuilds the slice of Clerk's payload this app acts on, field by field.
 *
 * Everything is re-derived rather than passed through, so `ClerkUserData` is
 * something the code downstream can rely on instead of a hope about the sender.
 * Unusable values become `null` (or are dropped) rather than propagating a
 * wrong type into a query.
 */
function normaliseUserData(id: string, data: Record<string, unknown>): ClerkUserData {
  return {
    id,
    object: optionalText(data["object"], CLERK_ID_MAX_LENGTH),
    first_name: optionalText(data["first_name"], NAME_PART_MAX_LENGTH),
    last_name: optionalText(data["last_name"], NAME_PART_MAX_LENGTH),
    primary_email_address_id: optionalText(
      data["primary_email_address_id"],
      CLERK_ID_MAX_LENGTH,
    ),
    email_addresses: normaliseAddresses(data["email_addresses"]),
    public_metadata: isRecord(data["public_metadata"]) ? data["public_metadata"] : null,
  }
}

/**
 * Keeps only addresses that are complete enough to store. A half-formed entry
 * is dropped instead of being mirrored as a partial string, and a list that
 * yields nothing usable becomes `null` so the profile records "no email known"
 * rather than a row of blanks.
 */
function normaliseAddresses(
  value: unknown,
): NonNullable<ClerkUserData["email_addresses"]> | null {
  if (!Array.isArray(value)) return null

  const addresses: NonNullable<ClerkUserData["email_addresses"]> = []
  for (const entry of value.slice(0, MAX_MIRRORED_ADDRESSES)) {
    if (!isRecord(entry)) continue

    const addressId = entry["id"]
    const address = entry["email_address"]
    if (typeof addressId !== "string" || addressId.length === 0) continue
    if (typeof address !== "string" || !address.includes("@")) continue

    const verification = entry["verification"]
    addresses.push({
      id: clip(addressId, CLERK_ID_MAX_LENGTH),
      email_address: clip(address, EMAIL_MAX_LENGTH),
      verification: isRecord(verification)
        ? { status: optionalText(verification["status"], 64) }
        : null,
    })
  }

  return addresses.length > 0 ? addresses : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** A string within `max`, or null. Non-strings are a mismatch, not a value. */
function optionalText(value: unknown, max: number): string | null {
  return typeof value === "string" ? clip(value, max) : null
}

/** Truncates rather than rejects, for display and for free-text fields. */
function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value
}

/**
 * Verifies and parses an incoming webhook.
 *
 * The raw body must be used — re-serialising the parsed JSON changes the bytes
 * and the signature will never match, which is the usual cause of "valid"
 * webhooks being rejected after a body-parser refactor.
 *
 * Throws `BadRequestError` on any verification failure. The signature is the
 * only authentication this endpoint has, so a failure is indistinguishable
 * from a malformed body by design: an attacker probing the endpoint learns
 * nothing about which part was wrong.
 */
export function verifyClerkEvent(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
): VerifiedClerkEvent {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    throw new Error("CLERK_WEBHOOK_SECRET is not set; cannot verify Clerk webhooks.")
  }

  const payload = {
    "svix-id": header(headers, "svix-id"),
    "svix-timestamp": header(headers, "svix-timestamp"),
    "svix-signature": header(headers, "svix-signature"),
  }

  try {
    // svix v2's `verify` only authenticates the bytes and resolves to
    // `undefined` — at runtime, not merely in the types. So the signature check
    // and the parse are two separate steps: verify first (proving these exact
    // bytes are authentic), and only then trust the body enough to JSON.parse.
    new Webhook(secret).verify(rawBody, payload)
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      throw new BadRequestError("Invalid webhook signature.")
    }
    throw err
  }

  // Authenticated, so a parse failure is a malformed Clerk event rather than
  // an attack; either way it is a 400 and never a 500.
  try {
    return JSON.parse(rawBody) as VerifiedClerkEvent
  } catch {
    throw new BadRequestError("Malformed webhook payload.")
  }
}

/**
 * Express lowercases incoming header names, but svix is documented against the
 * canonical casing, and a proxy may hand us arrays for repeated headers.
 * Normalising in one place keeps the verify call readable.
 */
function header(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string {
  const value = headers[name] ?? headers[name.toLowerCase()]
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "")
}

/**
 * Picks the primary email and whether Clerk considers it verified.
 *
 * Verification state is reported rather than inferred: a row is only marked
 * verified when Clerk says `verified`, and is demoted back to unverified if
 * Clerk ever reports otherwise, so a revoked domain cannot leave a stale
 * verified badge in our database.
 */
export function readPrimaryEmail(user: ClerkUserData): ClerkEmailMirror {
  const addresses = Array.isArray(user.email_addresses) ? user.email_addresses : []
  const primaryId = user.primary_email_address_id
  const primary =
    addresses.find((address) => address.id === primaryId) ??
    // Fall back to the first address so a phone-only account (no primary set)
    // still mirrors an email if one happens to be attached.
    addresses[0]

  if (!primary) return { email: null, emailVerifiedAt: null }

  // Re-checked rather than trusted: `classifyClerkEvent` already filtered these
  // on the way in, and this is the one place an absent address string would
  // otherwise become a TypeError inside a signed-but-malformed delivery.
  if (typeof primary.email_address !== "string" || primary.email_address.length === 0) {
    return { email: null, emailVerifiedAt: null }
  }

  return {
    email: primary.email_address.toLowerCase(),
    emailVerifiedAt:
      primary.verification?.status === "verified" ? new Date() : null,
  }
}

/** Best-effort display name from Clerk, used only when the profile has none. */
export function readFallbackName(user: ClerkUserData): string | null {
  const joined = [user.first_name, user.last_name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .trim()
  if (joined.length === 0) return null
  // Each part is capped on the way in, but the join is what actually lands in
  // `User.fullName`, so the limit belongs here.
  return clip(joined, FULL_NAME_MAX_LENGTH)
}

/**
 * Role is mirrored from Clerk's `publicMetadata` so it stays queryable in SQL,
 * but only a slug is honoured. An absent or malformed value means "no elevated
 * role", never a fallback to something permissive.
 *
 * A slug shape rather than a fixed list, because nothing gates on a role yet
 * and a hardcoded allowlist would be policy invented ahead of its first
 * consumer. The constraint that matters is the opposite one: this string is
 * compared against a literal in a future authorisation check, so it must not be
 * able to arrive as arbitrary text.
 */
export function readRole(user: ClerkUserData): string | null {
  const metadata = user.public_metadata
  if (!isRecord(metadata)) return null

  const role = metadata["role"]
  if (typeof role !== "string") return null

  const trimmed = role.trim()
  if (trimmed.length === 0 || trimmed.length > ROLE_MAX_LENGTH) return null
  if (!/^[a-z0-9_-]+$/.test(trimmed)) return null

  return trimmed
}
