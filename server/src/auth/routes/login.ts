import { Router } from "express"
import rateLimit from "express-rate-limit"

import { prisma } from "../../lib/prisma.js"
import { handleError } from "../../lib/errors.js"
import { generateOpaqueToken, hashToken, signAccessToken, verifyPassword } from "../crypto.js"
import { REFRESH_TOKEN_TTL_MS, setRefreshCookie } from "../cookies.js"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Fixed argon2id hash of a random throwaway string. Used as the verification
 * target when an email has no account, so the cost is identical to a real
 * lookup and response timing can't reveal whether an account exists.
 */
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,p=4,t=3$HlVB5ishe8fYeTvefBX8vw$50BT9T6BW6DGtzUv/Kyjcu284g6zEzEt8We3ukrqSnI"

const LOGIN_FAIL_THRESHOLD = 5
const LOCKOUT_MS = 15 * 60 * 1000

/** Same message regardless of whether the failure is a wrong password or a missing account. */
const GENERIC_INVALID_CREDENTIALS = "Invalid email or password."
const GENERIC_LOCKED = "Too many failed attempts. Please try again later."

// Per-IP burst limiter; the per-account lockout above is an independent layer.
const ipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
})

export const loginRouter = Router()

loginRouter.post("/", ipLimiter, async (req, res) => {
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

  const normalizedEmail = emailValue.toLowerCase()
  const ipAddress = req.ip ?? null
  const userAgent = req.get("user-agent") ?? null

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    // Locked account: reject before any password work. Returning fast here is
    // fine — the attacker already knows this account exists and is throttled.
    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      res.status(429).json({ error: GENERIC_LOCKED })
      return
    }

    // Always burn one argon2 verify: the real hash when the account exists,
    // the dummy hash when it doesn't, so timing can't leak existence.
    const passwordOk = await verifyPassword(password, user ? user.passwordHash : DUMMY_PASSWORD_HASH)

    if (!user || !passwordOk) {
      if (user) {
        const { failedLoginCount } = await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: { increment: 1 } },
          select: { failedLoginCount: true },
        })

        if (failedLoginCount >= LOGIN_FAIL_THRESHOLD) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MS) },
          })
        }

        await prisma.authAuditLog.create({
          data: {
            userId: user.id,
            event: "login_failed",
            ipAddress,
            userAgent,
            metadata: { failedLoginCount },
          },
        })
      }

      res.status(401).json({ error: GENERIC_INVALID_CREDENTIALS })
      return
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    })

    // Access token goes in the response body (held in memory by the client)…
    const accessToken = await signAccessToken(user.id, user.role)

    // …the refresh token goes in an HttpOnly cookie. Only the hash is stored.
    const refreshToken = generateOpaqueToken()
    const refreshTokenHash = hashToken(refreshToken)

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        deviceLabel: userAgent?.trim() ? userAgent.trim().slice(0, 200) : null,
        ipAddress,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    })

    setRefreshCookie(res, refreshToken)

    await prisma.authAuditLog.create({
      data: {
        userId: user.id,
        event: "login_success",
        ipAddress,
        userAgent,
        metadata: { refreshTokenHash },
      },
    })

    res.status(200).json({ accessToken })
  } catch (err) {
    handleError(err, res)
  }
})