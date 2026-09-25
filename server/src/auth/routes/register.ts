import { Router } from "express"
import rateLimit from "express-rate-limit"

import { prisma } from "../../lib/prisma.js"
import { handleError } from "../../lib/errors.js"
import { generateOpaqueToken, hashPassword, hashToken } from "../crypto.js"
import { validatePasswordPolicy } from "../password-policy.js"
import { sendVerificationEmail } from "../email.js"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VERIFICATION_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

/** Identical response for every valid-looking registration attempt, existing or not. */
const GENERIC_SUCCESS_MESSAGE = "If that email isn't already registered, check your inbox to verify it."

const HOUR_MS = 60 * 60 * 1000

const ipLimiter = rateLimit({
  windowMs: HOUR_MS,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Please try again later." },
})

const emailLimiter = rateLimit({
  windowMs: HOUR_MS,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = (req.body as { email?: unknown } | undefined)?.email
    return typeof email === "string" && email.trim()
      ? email.trim().toLowerCase()
      : `email-unknown:${req.ip ?? ""}`
  },
  message: { error: "Too many registration attempts for this email. Please try again later." },
})

export const registerRouter = Router()

registerRouter.post("/", ipLimiter, emailLimiter, async (req, res) => {
  const { email, password } = (req.body ?? {}) as Record<string, unknown>

  const emailValue = typeof email === "string" ? email.trim() : ""
  if (!emailValue || typeof password !== "string" || password.length === 0) {
    res.status(400).json({ error: "email and password are required" })
    return
  }

  if (!EMAIL_REGEX.test(emailValue)) {
    res.status(400).json({ error: "Invalid email address." })
    return
  }

  const passwordError = validatePasswordPolicy(password)
  if (passwordError) {
    res.status(422).json({ error: passwordError })
    return
  }

  const normalizedEmail = emailValue.toLowerCase()
  const ipAddress = req.ip ?? null
  const userAgent = req.get("user-agent") ?? null

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (existingUser) {
      // Burn the same argon2 work a real signup performs, so duplicate
      // submissions don't respond measurably faster than fresh ones.
      await hashPassword(password)

      await prisma.authAuditLog.create({
        data: {
          userId: existingUser.id,
          event: "register_duplicate",
          ipAddress,
          userAgent,
          metadata: { email: normalizedEmail },
        },
      })

      res.status(200).json({ message: GENERIC_SUCCESS_MESSAGE })
      return
    }

    const passwordHash = await hashPassword(password)
    const token = generateOpaqueToken()
    const tokenHash = hashToken(token)

    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash },
    })

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        purpose: "EMAIL_VERIFY",
        tokenHash,
        expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
        requestedFromIp: ipAddress,
      },
    })

    await prisma.authAuditLog.create({
      data: {
        userId: user.id,
        event: "register_success",
        ipAddress,
        userAgent,
        metadata: { email: normalizedEmail, verificationTokenHash: tokenHash },
      },
    })

    // Fire-and-forget: the response must stay identical whether the mail is
    // actually sent, so delivery never becomes an account-existence oracle.
    void sendVerificationEmail({ to: normalizedEmail, token }).catch((error) => {
      console.error("Failed to send verification email:", error)
    })

    res.status(200).json({ message: GENERIC_SUCCESS_MESSAGE })
  } catch (err) {
    handleError(err, res)
  }
})