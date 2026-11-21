import { Router } from "express"

import { readAuthUserId } from "../../lib/clerk.js"
import { handleError } from "../../lib/errors.js"
import { createLimiter } from "../../lib/rate-limit.js"
import { requireAuth } from "../middleware/require-auth.js"
import { getOrCreateAuthProfile } from "../services/me.js"
import { updateAuthProfile } from "../services/profile-update.js"

export const meRouter = Router()

const MINUTE_MS = 60 * 1000

function meKey(req: import("express").Request): string {
  return `me:${readAuthUserId(req) ?? req.ip ?? "unknown"}`
}

const readLimiter = createLimiter({
  prefix: "me-read",
  windowMs: MINUTE_MS,
  limit: 60,
  keyGenerator: meKey,
  failClosed: true,
})

const updateLimiter = createLimiter({
  prefix: "me-update",
  windowMs: MINUTE_MS,
  limit: 10,
  keyGenerator: meKey,
  failClosed: true,
})

/**
 * GET /api/auth/me — the caller's identity: the Clerk id the client
 * authenticates with, plus the local profile fields this app owns.
 */
meRouter.get("/", requireAuth, readLimiter, async (req, res) => {
  try {
    // requireAuth already rejected anonymous callers, so this cannot be null
    // here; the re-read is the cost of not threading it through request state.
    const profile = await getOrCreateAuthProfile(readAuthUserId(req)!)

    // Null now means Clerk itself no longer has this user — the account was
    // deleted on Clerk's side. A merely *unsynced* profile no longer reaches
    // this point, because it is created from Clerk on the spot.
    if (!profile) {
      res.status(401).json({ error: "Account not found." })
      return
    }

    res.json(profile)
  } catch (err) {
    handleError(err, res)
  }
})

/**
 * PATCH /api/auth/me — lets the caller edit the profile fields this app owns.
 *
 * Narrow by design: name and college only. Email, phone and password belong to
 * Clerk, and accepting an edit here that Clerk does not know about would be
 * reverted by the next `user.updated` webhook.
 */
meRouter.patch("/", requireAuth, updateLimiter, async (req, res) => {
  try {
    const clerkUserId = readAuthUserId(req)!
    const body = (req.body ?? {}) as Record<string, unknown>

    // Reject non-strings rather than letting them reach the length check, where a
    // number would be compared against a limit and a `null` would silently clear
    // a field the caller never mentioned.
    const updates: { fullName?: string; collegeName?: string } = {}
    for (const field of ["fullName", "collegeName"] as const) {
      const value = body[field]
      if (value === undefined) continue
      if (typeof value !== "string") {
        res.status(400).json({ error: `${field} must be a string` })
        return
      }
      updates[field] = value
    }

    const profile = await updateAuthProfile(clerkUserId, updates)
    res.json(profile)
  } catch (err) {
    handleError(err, res)
  }
})
