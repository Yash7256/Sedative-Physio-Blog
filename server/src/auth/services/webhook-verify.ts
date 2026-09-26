import { Webhook, WebhookVerificationError } from "svix"

import { BadRequestError } from "../../lib/errors.js"

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
  object?: string
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
  const addresses = user.email_addresses ?? []
  const primaryId = user.primary_email_address_id
  const primary =
    addresses.find((address) => address.id === primaryId) ??
    // Fall back to the first address so a phone-only account (no primary set)
    // still mirrors an email if one happens to be attached.
    addresses[0]

  if (!primary) return { email: null, emailVerifiedAt: null }

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
  return joined.length > 0 ? joined : null
}

/**
 * Role is mirrored from Clerk's `publicMetadata` so it stays queryable in SQL,
 * but only a real string is honoured. An absent or malformed value means
 * "no elevated role", never a fallback to something permissive.
 */
export function readRole(user: ClerkUserData): string | null {
  const role = user.public_metadata?.["role"]
  return typeof role === "string" && role.trim().length > 0 ? role.trim() : null
}
