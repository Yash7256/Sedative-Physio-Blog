import { getClerkClient } from "../../lib/clerk.js"
import { prisma } from "../../lib/prisma.js"
import { getAuthProfile } from "./me.js"
import { syncProfileFromClerk } from "./profile-sync.js"
import type { ClerkUserData } from "./webhook-verify.js"

/**
 * Just-in-time profile provisioning.
 *
 * The webhook is the *normal* way a profile row appears, but it is not the only
 * way this app used to be able to get one, and that left a real failure mode:
 * Clerk holds the authoritative name the moment somebody finishes Google
 * sign-in, yet until a `user.created` delivery lands there is no local row, so
 * `GET /api/auth/me` 401s and the UI shows nothing at all — not the name, not an
 * error the user can act on.
 *
 * That is not hypothetical. A webhook can only be delivered to a publicly
 * reachable HTTPS URL, so on a laptop (`localhost:5173` proxying to
 * `localhost:3000`) Clerk has nowhere to send it. Every local OAuth sign-in
 * lands in exactly this state, permanently, and the fix is to make the webhook a
 * fast path rather than a precondition.
 *
 * So when a verified session has no row, the row is created *from Clerk* on the
 * spot. Clerk is the source of truth, so this copies rather than invents: it runs
 * the same `syncProfileFromClerk` the webhook runs, including the rules about
 * adopting a pre-Clerk row by email and never reviving a tombstoned one.
 */
export async function ensureAuthProfile(clerkUserId: string) {
  const existing = await getAuthProfile(clerkUserId)
  if (existing) return existing

  // If a tombstoned row still points at this id, that is a Clerk-side delete we
  // have already handled. `anonymiseProfile` nulls the column, so this only
  // matches a row mid-flight — and reviving a deleted account is worse than
  // making the person sign up again.
  const tombstoned = await prisma.user.findFirst({
    where: { clerkUserId, deletedAt: { not: null } },
    select: { id: true },
  })
  if (tombstoned) return null

  const clerkUser = await readClerkUser(clerkUserId)
  if (!clerkUser) return null

  await syncProfileFromClerk(clerkUser)
  return getAuthProfile(clerkUserId)
}

/**
 * Reads the user from Clerk, treating "no such user" as null rather than an
 * error.
 *
 * A missing user is a legitimate answer — the account can be deleted in Clerk
 * between the session being minted and this call — and it means exactly what the
 * old 401 meant: there is nothing to serve. A transport failure is *not* the same
 * answer and is allowed to propagate, so a Clerk outage surfaces as a 5xx the
 * client can retry instead of a permanent "Account not found".
 */
async function readClerkUser(clerkUserId: string): Promise<ClerkUserData | null> {
  try {
    const user = await getClerkClient().users.getUser(clerkUserId)
    return toSyncData(user)
  } catch (err) {
    if (isClerkNotFound(err)) return null
    throw err
  }
}

/**
 * Converts a Clerk Backend API user into the snake_case shape the webhook
 * payload uses.
 *
 * The two shapes are the same data with different conventions — the webhook
 * delivers raw REST JSON (`first_name`), the SDK returns camelCase
 * (`firstName`) — so both are mapped onto the webhook's shape and then through
 * the one set of readers. Duplicating the parsing rules instead would mean two
 * places to keep in step, and this one already exists.
 */
function toSyncData(user: {
  id: string
  object?: string
  firstName?: string | null
  lastName?: string | null
  primaryEmailAddressId?: string | null
  emailAddresses?: Array<{
    id: string
    emailAddress: string
    verification?: { status?: string | null } | null
  }> | null
  publicMetadata?: Record<string, unknown> | null
}): ClerkUserData {
  return {
    id: user.id,
    object: user.object ?? "user",
    first_name: user.firstName ?? null,
    last_name: user.lastName ?? null,
    primary_email_address_id: user.primaryEmailAddressId ?? null,
    email_addresses: (user.emailAddresses ?? []).map((address) => ({
      id: address.id,
      email_address: address.emailAddress,
      verification: address.verification ? { status: address.verification.status ?? null } : null,
    })),
    public_metadata: user.publicMetadata ?? null,
  }
}

/** True for Clerk's 404, which is an answer rather than a failure. */
function isClerkNotFound(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false

  const status = (err as { status?: unknown }).status
  if (status === 404) return true

  // The SDK also reports it as a ClerkAPIError carrying an errors array.
  const errors = (err as { errors?: unknown }).errors
  return (
    Array.isArray(errors) &&
    errors.some((e) => typeof e === "object" && e !== null && (e as { code?: unknown }).code === "resource_not_found")
  )
}
