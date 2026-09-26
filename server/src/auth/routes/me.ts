import { Router } from "express"

import { readAuthUserId } from "../../lib/clerk.js"
import { handleError } from "../../lib/errors.js"
import { requireAuth } from "../middleware/require-auth.js"
import { getAuthProfile } from "../services/me.js"

export const meRouter = Router()

/**
 * GET /api/auth/me — the caller's identity: the Clerk id the client
 * authenticates with, plus the local profile fields this app owns.
 */
meRouter.get("/", requireAuth, async (req, res) => {
  try {
    // requireAuth already rejected anonymous callers, so this cannot be null
    // here; the re-read is the cost of not threading it through request state.
    const profile = await getAuthProfile(readAuthUserId(req)!)

    // The Clerk session is valid but there is no local profile — either the
    // `user.created` webhook has not landed yet, or the row was tombstoned
    // after a Clerk-side delete.
    if (!profile) {
      res.status(401).json({ error: "Account not found." })
      return
    }

    res.json(profile)
  } catch (err) {
    handleError(err, res)
  }
})
