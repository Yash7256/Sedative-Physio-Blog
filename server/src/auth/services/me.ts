import { prisma } from "../../lib/prisma.js"

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
 * everything the app actually cares about (role, name, college). A valid
 * session with no profile row is a real state — the person signed up through
 * Clerk but the `user.created` webhook has not landed yet — so the route turns
 * a null return into 401 rather than serving a half-empty identity.
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
