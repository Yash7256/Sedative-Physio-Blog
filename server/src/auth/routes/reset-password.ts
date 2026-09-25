import { Router } from "express"

import { prisma } from "../../lib/prisma.js"
import { handleError } from "../../lib/errors.js"
import { hashPassword, hashToken } from "../crypto.js"
import { validatePasswordPolicy } from "../password-policy.js"
import { sendPasswordChangedEmail } from "../email.js"

const GENERIC_FAILURE_MESSAGE = "Invalid or expired reset link."

export const resetPasswordRouter = Router()

// POST /api/auth/reset-password?token=...&password=... — consumes a reset
// token issued by forgot-password and replaces the user's password, killing
// every existing session in the process.
resetPasswordRouter.post("/", async (req, res) => {
  const { password } = (req.body ?? {}) as Record<string, unknown>
  const token = typeof req.body?.token === "string" ? req.body.token : null

  if (!token || typeof password !== "string" || password.length === 0) {
    res.status(400).json({ error: "token and password are required" })
    return
  }

  const passwordError = validatePasswordPolicy(password)
  if (passwordError) {
    res.status(422).json({ error: passwordError })
    return
  }

  const ipAddress = req.ip ?? null
  const userAgent = req.get("user-agent") ?? null

  try {
    const resetToken = await prisma.verificationToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        purpose: "PASSWORD_RESET",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (!resetToken) {
      await prisma.authAuditLog.create({
        data: {
          event: "password_reset_failed",
          ipAddress,
          userAgent,
        },
      })
      res.status(400).json({ error: GENERIC_FAILURE_MESSAGE })
      return
    }

    const passwordHash = await hashPassword(password)

    // One atomic unit: set the new hash, consume the token, and revoke every
    // outstanding refresh token. A reset must log the whole family out —
    // including a session the attacker may still hold.
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      })
      await tx.verificationToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      })
      await tx.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    })

    await prisma.authAuditLog.create({
      data: {
        userId: resetToken.userId,
        event: "password_reset_completed",
        ipAddress,
        userAgent,
        metadata: { verificationTokenId: resetToken.id },
      },
    })

    const email = (
      await prisma.user.findUnique({ where: { id: resetToken.userId }, select: { email: true } })
    )?.email

    if (email) {
      void sendPasswordChangedEmail({ to: email }).catch((error) => {
        console.error("Failed to send password changed email:", error)
      })
    }

    res.status(200).json({ message: "Password updated. Please sign in with your new password." })
  } catch (err) {
    handleError(err, res)
  }
})