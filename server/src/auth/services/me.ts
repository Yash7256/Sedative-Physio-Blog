import { prisma } from "../../lib/prisma.js"
import { ensureAuthProfile } from "./provision.js"

/** The two ids this app jugles, which are easy to confuse and expensive to get wrong. */
export interface AuthProfile {
  /** Clerk's user id, i.e. the `sub` claim of the verified session. */
  clerkUserId: string
  /** Internal row id, for use as a foreign key elsewhere. */
  userId: string
  role: string
  email: string | null
  fullName: string | null
  collegeName: string | null
  emailVerified: boolean
}

/**
 * Resolves the caller's domain profile for `GET /api/auth/me`.
 *
 * The Clerk session proves *who is calling*; this query is what supplies
 * everything the app actually cares about (role, name, college).
 *
 * A missing row is provisioned on the spot rather than reported, so a signed-in
 * person whose `user.created` webhook was never delivered still gets their real
 * name. That leaves one case for a null: Clerk itself no longer has the user.
 */
export async function getAuthProfile(clerkUserId: string): Promise<AuthProfile | null> {
  const user = await prisma.user.findFirst({
    // A tombstoned row keeps its order history but no longer authenticates.
    where: { clerkUserId, deletedAt: null },
    select: {
      id: true,
      clerkUserId: true,
      role: true,
      email: true,
      fullName: true,
      collegeName: true,
      emailVerifiedAt: true,
    },
  })

  if (!user?.clerkUserId) return null

  return {
    clerkUserId: user.clerkUserId,
    userId: user.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    collegeName: user.collegeName,
    emailVerified: user.emailVerifiedAt !== null,
  }
}

/**
 * The caller's profile, created from Clerk if it does not exist yet.
 *
 * This is the entry point the routes should use. The webhook remains the fast
 * path — it fills the row before the user ever asks — but it is not a
 * precondition, so provisioning here is what makes a missed or undeliverable
 * webhook a non-event.
 */
export async function getOrCreateAuthProfile(clerkUserId: string): Promise<AuthProfile | null> {
  return ensureAuthProfile(clerkUserId)
}

/**
 * Maps a Clerk user id to this app's `User.id`.
 *
 * `req.auth().userId` is Clerk's id (`user_…`) but every foreign key in the
 * schema — `Order.userId`, `Enrollment.userId`, `AuthAuditLog.userId` — points at
 * the local `User.id` cuid. Handing one where the other is expected fails in two
 * very different ways, which is why this exists rather than a comment:
 *
 *   - a *read* silently matches nothing, so the caller sees an empty result and
 *     concludes the user has no enrollments or orders;
 *   - a *write* trips the foreign key outright, so the request 500s.
 *
 * A row that does not exist yet is provisioned from Clerk, so an order placed
 * moments after a first Google sign-in is still attributed to the person who
 * placed it. Without that, `create-order` runs with a null id and the order only
 * becomes attributable if some later request happens to have a row to link it —
 * which is exactly the request that was blocked on the row in the first place.
 *
 * Null still means "not attributable": either nobody is signed in, or Clerk no
 * longer knows this user. Callers that write must treat it as unauthenticated.
 */
export async function resolveLocalUserId(
  clerkUserId: string | null | undefined,
): Promise<string | null> {
  if (!clerkUserId) return null

  const user = await prisma.user.findFirst({
    // A tombstoned row keeps its order history but must not be written to.
    where: { clerkUserId, deletedAt: null },
    select: { id: true },
  })
  if (user) return user.id

  const profile = await ensureAuthProfile(clerkUserId)
  return profile?.userId ?? null
}
