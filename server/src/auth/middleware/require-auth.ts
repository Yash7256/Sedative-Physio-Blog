import type { RequestHandler } from "express"

import { readAuth } from "../../lib/clerk.js"

/**
 * Rejects anything without a verified Clerk session: 401, never a redirect and
 * never a 403.
 *
 * `clerkMiddleware()` (mounted globally in `app.ts`) leaves `req.auth().userId`
 * null for anonymous or invalid-token requests rather than throwing. That is
 * what makes optional auth on `/api/payments` work off the same middleware;
 * this handler is where "optional" becomes "required".
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!readAuth(req)?.userId) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }
  next()
}
