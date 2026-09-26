import { transporter } from "../lib/email.js"

export interface ContactPayload {
  name: string
  email: string
  phone: string
  message: string
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

/**
 * Every field below is unauthenticated user input that lands inside the HTML
 * part of the email, so it must be escaped or a submission can inject markup
 * (or a spoofed "sent" banner) into the inbox.
 */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}

/**
 * Sends the notification email for a contact form submission.
 *
 * STUB: when SMTP credentials are not configured (SMTP_USER unset), the
 * submission is logged to the console instead of sending real mail, so local
 * development and tests stay mail-free. Same convention as auth/email.ts.
 */
export async function sendContactEmail(payload: ContactPayload): Promise<void> {
  const to = process.env.CONTACT_EMAIL ?? "sedativephysio@gmail.com"

  if (!process.env.SMTP_USER) {
    console.warn(
      `[contact] SMTP not configured — submission from ${payload.email}:\n` +
        `Name: ${payload.name}\n` +
        `Phone: ${payload.phone || "—"}\n` +
        `Message:\n${payload.message}`,
    )
    return
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#0b0b0c;border-bottom:2px solid #eee;padding-bottom:10px">
        New Contact Form Submission
      </h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr>
          <td style="padding:8px 12px;font-weight:bold;color:#686a6b;width:140px">Name</td>
          <td style="padding:8px 12px;color:#0b0b0c">${escapeHtml(payload.name)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;color:#686a6b">Email</td>
          <td style="padding:8px 12px;color:#0b0b0c"><a href="mailto:${encodeURIComponent(payload.email)}">${escapeHtml(payload.email)}</a></td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;color:#686a6b">Phone</td>
          <td style="padding:8px 12px;color:#0b0b0c">${escapeHtml(payload.phone) || "—"}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;color:#686a6b;vertical-align:top">Message</td>
          <td style="padding:8px 12px;color:#0b0b0c;white-space:pre-wrap">${escapeHtml(payload.message)}</td>
        </tr>
      </table>
    </div>
  `

  // Collapse whitespace so a newline in a submitted name can't split the header.
  const subjectName = payload.name.replace(/\s+/g, " ").trim()

  await transporter.sendMail({
    from: `"Sedative Physio Website" <${process.env.SMTP_USER ?? ""}>`,
    to,
    replyTo: payload.email,
    subject: `Contact Form: ${subjectName}`,
    html,
    text: `New Contact Form Submission\n\nName: ${payload.name}\nEmail: ${payload.email}\nPhone: ${payload.phone || "—"}\nMessage:\n${payload.message}`,
  })
}
