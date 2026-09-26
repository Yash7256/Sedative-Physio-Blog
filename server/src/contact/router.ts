import { Router } from "express"
import rateLimit from "express-rate-limit"

import { sendContactEmail } from "./service.js"
import { handleError } from "../lib/errors.js"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Length caps. This endpoint is unauthenticated and every accepted submission
 * turns into a real outbound email, so unbounded fields are both an abuse
 * vector and a way to bloat the mail subject header.
 */
const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 254
const MAX_PHONE_LENGTH = 32
const MAX_MESSAGE_LENGTH = 5000

const HOUR_MS = 60 * 60 * 1000

const ipLimiter = rateLimit({
  windowMs: HOUR_MS,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages sent. Please try again later." },
})

const emailLimiter = rateLimit({
  windowMs: HOUR_MS,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = (req.body as { email?: unknown } | undefined)?.email
    return typeof email === "string" && email.trim()
      ? `contact:${email.trim().toLowerCase()}`
      : `contact-unknown:${req.ip ?? ""}`
  },
  message: { error: "Too many messages sent for this email. Please try again later." },
})

export const contactRouter = Router()

contactRouter.post("/", ipLimiter, emailLimiter, async (req, res) => {
  try {
    const { name, email, phone, message } = (req.body ?? {}) as Record<string, unknown>

    const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "")

    const nameValue = str(name)
    const emailValue = str(email)
    const phoneValue = str(phone)
    const messageValue = str(message)

    if (!nameValue || !emailValue || !messageValue) {
      res.status(400).json({ error: "Name, email, and message are required." })
      return
    }

    if (!EMAIL_REGEX.test(emailValue) || emailValue.length > MAX_EMAIL_LENGTH) {
      res.status(400).json({ error: "Invalid email address." })
      return
    }

    if (nameValue.length > MAX_NAME_LENGTH) {
      res.status(400).json({ error: "Name must be 100 characters or fewer." })
      return
    }

    if (phoneValue.length > MAX_PHONE_LENGTH) {
      res.status(400).json({ error: "Phone number must be 32 characters or fewer." })
      return
    }

    if (messageValue.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` })
      return
    }

    await sendContactEmail({
      name: nameValue,
      email: emailValue,
      phone: phoneValue,
      message: messageValue,
    })

    res.status(200).json({ success: true })
  } catch (err) {
    handleError(err, res)
  }
})
