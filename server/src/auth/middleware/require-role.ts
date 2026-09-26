import type { Request, RequestHandler } from "express"

import { readAuth } from "../../lib/clerk.js"

/**
 * Middleware factory for role-gated routes: 401 unauthenticated, 403 wrong role.
 *
 * The role is read from Clerk's `publicMetadata.role` via the session claims,
 * which means no database round-trip and no chance of the middleware
 * disagreeing with what the token was actually minted with. `User.role` mirrors
 * the same value for SQL queries, but is deliberately not the source of truth
 * for authorisation — a stale mirror should fail closed, not grant access.
 *
 * Mount after `requireAuth`.
 */
export function requireRole(role: string): RequestHandler {
  return (req, res, next) => {
    const userId = readAuth(req)?.userId
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }

    if (readRole(req) !== role) {
      res.status(403).json({ error: "Forbidden" })
      return
    }

    next()
  }
}

/**
 * `publicMetadata` is typed as an opaque object bag, so the claim is narrowed
 * here rather than asserted with a cast. Anything that is not a non-empty
 * string counts as "no role", which fails closed.
 */
function readRole(req: Request): string | null {
  const metadata = readAuth(req)?.sessionClaims?.metadata
  if (typeof metadata !== "object" || metadata === null) return null

  const role = (metadata as Record<string, unknown>)["role"]
  return typeof role === "string" && role.length > 0 ? role : null
}
