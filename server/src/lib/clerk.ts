import type { ExpressRequestWithAuth } from "@clerk/express"
import type { Request } from "express"

/**
 * The session-scoped auth object: `SignedInAuthObject | SignedOutAuthObject`.
 *
 * Derived from Clerk's own `req.auth` signature rather than imported by name,
 * because @clerk/backend's `AuthObject` is a *wider* union that also covers
 * machine-to-machine and API-key callers. Those have `id`/`subject` but no
 * `userId` or `sessionClaims` — typing against `AuthObject` would let a
 * request-authenticated machine read as though it were a signed-in student.
 */
export type SessionAuth = ReturnType<ExpressRequestWithAuth["auth"]>

/**
 * Bridge between Clerk's request shape and the rest of the app.
 *
 * `@clerk/express` v2 attaches `req.auth` as a **function** returning
 * `SignedInAuthObject | SignedOutAuthObject`, and it deliberately does not
 * augment Express globally — so unlike the old custom middleware, there is no
 * `req.auth` type to lean on and every consumer has to narrow it explicitly.
 *
 * Centralising that here means one cast, one runtime guard, and one place to
 * revisit if Clerk's request API changes again.
 */
export function readAuth(req: Request): SessionAuth | null {
  const auth = (req as { auth?: unknown }).auth

  // Guard rather than call blindly. `clerkMiddleware()` is mounted globally in
  // `app.ts`, so this is only reachable if that mount is removed or reordered —
  // in which case a clear 401 beats an opaque "req.auth is not a function" 500
  // that gives no clue which module is at fault.
  if (typeof auth !== "function") return null

  return (auth as () => SessionAuth).call(req) ?? null
}

/**
 * Convenience for the common case: the caller is signed in.
 *
 * Returns null for an anonymous request *and* for a valid session whose local
 * profile is missing, so callers never have to distinguish the two. Both mean
 * "we have no local user to act on".
 */
export function readAuthUserId(req: Request): string | null {
  return readAuth(req)?.userId ?? null
}
