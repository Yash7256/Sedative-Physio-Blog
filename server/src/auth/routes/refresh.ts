import { Router } from "express"
import rateLimit from "express-rate-limit"

import { prisma } from "../../lib/prisma.js"
import { handleError } from "../../lib/errors.js"
import { generateOpaqueToken, hashToken, signAccessToken } from "../crypto.js"
import {
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
  clearRefreshCookie,
  setRefreshCookie,
} from "../cookies.js"

const REFRESH_FAILED = "Invalid or expired session."
const SESSION_REVOKED = "Session revoked. Please sign in again."

// Rotation happens automatically on every call, so the ceiling is a sanity
// limit rather than a strict burst guard.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many refresh attempts. Please try again later." },
})

export const refreshRouter = Router()

refreshRouter.post("/", refreshLimiter, async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME]
  if (!rawToken) {
    res.status(401).json({ error: REFRESH_FAILED })
    return
  }

  const tokenHash = hashToken(rawToken)
  const ipAddress = req.ip ?? null
  const userAgent = req.get("user-agent") ?? null

  try {
    const record = await prisma.refreshToken.findUnique({ where: { tokenHash } })

    if (!record) {
      res.status(401).json({ error: REFRESH_FAILED })
      return
    }

    const now = Date.now()

    // A revoked token that has a replacement is a rotated, already-replayed
    // token: someone is replaying an old token. Kill the whole session family
    // and force a fresh sign-in.
    if (record.revokedAt && record.replacedByTokenId) {
      await prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date(now) },
      })
      await prisma.authAuditLog.create({
        data: {
          userId: record.userId,
          event: "refresh_reuse_detected",
          ipAddress,
          userAgent,
          metadata: { tokenHash },
        },
      })
      clearRefreshCookie(res)
      res.status(401).json({ error: SESSION_REVOKED })
      return
    }

    // Revoked (logout) or expired: plain rejection, no family kill.
    if (record.revokedAt || record.expiresAt.getTime() <= now) {
      res.status(401).json({ error: REFRESH_FAILED })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: record.userId } })
    if (!user) {
      res.status(401).json({ error: REFRESH_FAILED })
      return
    }

    const accessToken = await signAccessToken(user.id, user.role)

    const newRefreshToken = generateOpaqueToken()
    const newRefreshTokenHash = hashToken(newRefreshToken)

    // Rotate: create the replacement row, then revoke the old one and point it
    // at the replacement so replay of this token is detected next time.
    await prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          userId: record.userId,
          tokenHash: newRefreshTokenHash,
          deviceLabel: record.deviceLabel,
          ipAddress,
          issuedAt: new Date(now),
          expiresAt: new Date(now + REFRESH_TOKEN_TTL_MS),
        },
        select: { id: true },
      })
      await tx.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date(now), replacedByTokenId: created.id },
      })
    })

    setRefreshCookie(res, newRefreshToken)
    res.status(200).json({ accessToken })
  } catch (err) {
    handleError(err, res)
  }
})