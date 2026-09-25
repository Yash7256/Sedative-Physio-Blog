import { Router } from "express"

import { prisma } from "../../lib/prisma.js"
import { handleError } from "../../lib/errors.js"
import { hashToken } from "../crypto.js"

const GENERIC_FAILURE_MESSAGE = "Invalid or expired verification link."

export const verifyEmailRouter = Router()

// GET so the link in the verification email can be followed directly.
verifyEmailRouter.get("/", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : null

  if (!token) {
    res.status(400).json({ verified: false, message: GENERIC_FAILURE_MESSAGE })
    return
  }

  const ipAddress = req.ip ?? null
  const userAgent = req.get("user-agent") ?? null

  try {
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        purpose: "EMAIL_VERIFY",
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (!verificationToken) {
      await prisma.authAuditLog.create({
        data: {
          event: "email_verify_failed",
          ipAddress,
          userAgent,
        },
      })
      res.status(400).json({ verified: false, message: GENERIC_FAILURE_MESSAGE })
      return
    }

    // One atomic unit: mark the address verified and consume the token.
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerifiedAt: new Date() },
      })
      await tx.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      })
    })

    await prisma.authAuditLog.create({
      data: {
        userId: verificationToken.userId,
        event: "email_verified",
        ipAddress,
        userAgent,
        metadata: { verificationTokenId: verificationToken.id },
      },
    })

    res.status(200).json({ verified: true, message: "Email verified. You can now sign in." })
  } catch (err) {
    handleError(err, res)
  }
})