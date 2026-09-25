import { Router } from "express"
import rateLimit from "express-rate-limit"

import { prisma } from "../../lib/prisma.js"
import { handleError } from "../../lib/errors.js"
import { generateOpaqueToken, hashToken } from "../crypto.js"
import { sendPasswordResetEmail } from "../email.js"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RESET_TOKEN_TTL_MS = 45 * 60 * 1000 // 45 minutes

/**
 * Identical response for every valid-looking reset request, existing or not,
 * so the endpoint can never be used to probe which emails are registered.
 */
const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for that email, a password reset link is on its way."

const HOUR_MS = 60 * 60 * 1000

const ipLimiter = rateLimit({
  windowMs: HOUR_MS,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many reset requests. Please try again later." },
})

const emailLimiter = rateLimit({
  windowMs: HOUR_MS,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = (req.body as { email?: unknown } | undefined)?.email
    return typeof email === "string" && email.trim()
      ? `reset:${email.trim().toLowerCase()}`
      : `reset-unknown:${req.ip ?? ""}`
  },
  message: { error: "Too many reset requests for this email. Please try again later." },
})

export const forgotPasswordRouter = Router()

forgotPasswordRouter.post("/", ipLimiter, emailLimiter, async (req, res) => {
  const { email } = (req.body ?? {}) as Record<string, unknown>

  const emailValue = typeof email === "string" ? email.trim() : ""
  if (!emailValue || !EMAIL_REGEX.test(emailValue)) {
    res.status(200).json({ message: GENERIC_SUCCESS_MESSAGE })
    return
  }

  const normalizedEmail = emailValue.toLowerCase()
  const ipAddress = req.ip ?? null
  const userAgent = req.get("user-agent") ?? null

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    // Existence-independent path: burn the same kind of work whether or not
    // the account exists, then respond identically.
    const token = generateOpaqueToken()
    const tokenHash = hashToken(token)

    if (user) {
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          purpose: "PASSWORD_RESET",
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          requestedFromIp: ipAddress,
        },
      })

      await prisma.authAuditLog.create({
        data: {
          userId: user.id,
          event: "password_reset_requested",
          ipAddress,
          userAgent,
          metadata: { verificationTokenHash: tokenHash },
        },
      })

      // Fire-and-forget: delivery must never become an existence oracle.
      void sendPasswordResetEmail({ to: normalizedEmail, token }).catch((error) => {
        console.error("Failed to send password reset email:", error)
      })
    }

    res.status(200).json({ message: GENERIC_SUCCESS_MESSAGE })
  } catch (err) {
    handleError(err, res)
  }
})