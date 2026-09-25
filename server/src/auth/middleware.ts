import type { NextFunction, Request, Response } from "express"

import { verifyAccessToken } from "./crypto.js"

/** Claims attached to `req.auth` by `authenticate` when the token is valid. */
export interface AuthContext {
  userId: string
  role: string
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext
    }
  }
}

/**
 * Reads `Authorization: Bearer <token>`, verifies it, and attaches
 * `{ userId, role }` to `req.auth` when valid. Never rejects on its own:
 * invalid or missing tokens just leave `req.auth` undefined and allow the
 * request to continue (mirrors the old getAuth() being optional).
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    const token = header && header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null
    if (token) {
      const claims = await verifyAccessToken(token)
      if (claims) req.auth = claims
    }
    next()
  } catch (err) {
    next(err instanceof Error ? err : new Error("authentication failure"))
  }
}

/**
 * Composes `authenticate` and rejects unauthenticated requests with the same
 * 401 JSON shape Clerk used: `{ error: "Unauthorized" }`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  authenticate(req, res, () => {
    if (!req.auth) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    next()
  })
}

/** Middleware factory for role-gated routes: 401 unauthenticated, 403 wrong role. */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    if (req.auth.role !== role) {
      res.status(403).json({ error: "Forbidden" })
      return
    }
    next()
  }
}