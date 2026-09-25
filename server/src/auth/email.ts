import { transporter } from "../lib/email.js"

/**
 * Frontend page that receives the raw verification token and calls
 * GET /api/auth/verify-email. Override in production with VERIFY_EMAIL_URL.
 */
const VERIFY_EMAIL_BASE_URL = process.env.VERIFY_EMAIL_URL ?? "http://localhost:5173/verify-email"

/**
 * Frontend page that receives the raw reset token and calls
 * POST /api/auth/reset-password. Override in production with RESET_PASSWORD_URL.
 */
const RESET_PASSWORD_BASE_URL =
  process.env.RESET_PASSWORD_URL ?? "http://localhost:5173/reset-password"

export interface SendVerificationEmailArgs {
  to: string
  /** Raw opaque token; only its hash is ever stored server-side. */
  token: string
}

/**
 * Sends the raw verification token as a link.
 *
 * STUB: when SMTP credentials are not configured (SMTP_USER unset), the link
 * is logged to the console instead of sending real mail, so local development
 * and tests stay mail-free.
 */
export async function sendVerificationEmail({ to, token }: SendVerificationEmailArgs): Promise<void> {
  const verifyUrl = `${VERIFY_EMAIL_BASE_URL}?token=${encodeURIComponent(token)}`

  if (!process.env.SMTP_USER) {
    console.warn(`[auth/email] SMTP not configured — verification link for ${to}: ${verifyUrl}`)
    return
  }

  await transporter.sendMail({
    from: `"Sedative Physio Website" <${process.env.SMTP_USER ?? ""}>`,
    to,
    subject: "Verify your email address",
    text: `Click to verify your email address:\n\n${verifyUrl}\n\nThis link expires in 1 hour.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0b0b0c;border-bottom:2px solid #eee;padding-bottom:10px">Verify your email</h2>
        <p style="color:#0b0b0c">Thanks for registering. Confirm your email address to activate your account.</p>
        <p><a href="${verifyUrl}" style="background:#0b0b0c;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px">Verify email</a></p>
        <p style="color:#686a6b;font-size:13px">This link expires in 1 hour. If you didn't create an account, you can ignore this email.</p>
      </div>
    `,
  })
}

export interface SendPasswordResetEmailArgs {
  to: string
  /** Raw opaque token; only its hash is ever stored server-side. */
  token: string
}

/**
 * Sends the raw reset token as a link. Same STUB/local-log behavior as
 * verification mail when SMTP is not configured.
 */
export async function sendPasswordResetEmail({
  to,
  token,
}: SendPasswordResetEmailArgs): Promise<void> {
  const resetUrl = `${RESET_PASSWORD_BASE_URL}?token=${encodeURIComponent(token)}`

  if (!process.env.SMTP_USER) {
    console.warn(`[auth/email] SMTP not configured — reset link for ${to}: ${resetUrl}`)
    return
  }

  await transporter.sendMail({
    from: `"Sedative Physio Website" <${process.env.SMTP_USER ?? ""}>`,
    to,
    subject: "Reset your password",
    text: `Click to reset your password:\n\n${resetUrl}\n\nThis link expires in 45 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0b0b0c;border-bottom:2px solid #eee;padding-bottom:10px">Reset your password</h2>
        <p style="color:#0b0b0c">We received a request to reset your password.</p>
        <p><a href="${resetUrl}" style="background:#0b0b0c;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px">Reset password</a></p>
        <p style="color:#686a6b;font-size:13px">This link expires in 45 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  })
}

export interface SendPasswordChangedEmailArgs {
  to: string
}

/** Notification sent after a password reset succeeds, so a hijacked account can't go unnoticed. */
export async function sendPasswordChangedEmail({ to }: SendPasswordChangedEmailArgs): Promise<void> {
  if (!process.env.SMTP_USER) {
    console.warn(`[auth/email] SMTP not configured — skipped "password changed" notice to ${to}`)
    return
  }

  await transporter.sendMail({
    from: `"Sedative Physio Website" <${process.env.SMTP_USER ?? ""}>`,
    to,
    subject: "Your password was changed",
    text: `Your password was just changed. If this wasn't you, contact support immediately.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0b0b0c;border-bottom:2px solid #eee;padding-bottom:10px">Password changed</h2>
        <p style="color:#0b0b0c">Your account's password was just updated.</p>
        <p style="color:#686a6b;font-size:13px">If you didn't make this change, an attacker may have access to your account — contact support right away.</p>
      </div>
    `,
  })
}