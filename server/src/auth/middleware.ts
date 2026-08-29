export { clerkMiddleware, getAuth } from "@clerk/express"

import type { NextFunction, Request, Response } from "express"
import { getAuth } from "@clerk/express"

/**
 * Rejects unauthenticated requests with a 401 JSON response. Use after
 * clerkMiddleware().
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req)
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  next()
}
