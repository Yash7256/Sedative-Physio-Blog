import nodemailer from "nodemailer"

/**
 * Shared SMTP transporter used by all server email sends. Configured via:
 *   SMTP_HOST (default smtp.gmail.com), SMTP_PORT (default 465), SMTP_USER, SMTP_PASS
 */
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true,
  auth: {
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
  },
})