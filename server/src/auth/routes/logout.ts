import { Router } from "express"

import { prisma } from "../../lib/prisma.js"
import { handleError } from "../../lib/errors.js"
import { requireAuth } from "../middleware.js"
import { hashToken } from "../crypto.js"
import { REFRESH_COOKIE_NAME, clearRefreshCookie } from "../cookies.js"

export const logoutRouter = Router()

// Revokes the current refresh token (if any). Never errors on a missing,
// unknown, or already-revoked token.
logoutRouter.post("/", async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME]

  try {
    if (rawToken) {
      const record = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashToken(rawToken) },
      })
      if (record && !record.revokedAt) {
        await prisma.refreshToken.update({
          where: { id: record.id },
          data: { revokedAt: new Date() },
        })
      }
    }

    clearRefreshCookie(res)
    res.status(200).json({ success: true })
  } catch (err) {
    handleError(err, res)
  }
})

// Revokes every non-revoked refresh token for the authenticated user.
logoutRouter.post("/all", requireAuth, async (req, res) => {
  const userId = req.auth!.userId

  try {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    clearRefreshCookie(res)
    res.status(200).json({ success: true })
  } catch (err) {
    handleError(err, res)
  }
})