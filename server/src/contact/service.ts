import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: true,
  auth: {
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
  },
})

export interface ContactPayload {
  firstName: string
  lastName: string
  email: string
  phone: string
  message: string
}

export async function sendContactEmail(payload: ContactPayload): Promise<void> {
  const to = process.env.CONTACT_EMAIL ?? "sedativephysio@gmail.com"

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#0b0b0c;border-bottom:2px solid #eee;padding-bottom:10px">
        New Contact Form Submission
      </h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr>
          <td style="padding:8px 12px;font-weight:bold;color:#686a6b;width:140px">Name</td>
          <td style="padding:8px 12px;color:#0b0b0c">${payload.firstName} ${payload.lastName}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;color:#686a6b">Email</td>
          <td style="padding:8px 12px;color:#0b0b0c"><a href="mailto:${payload.email}">${payload.email}</a></td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;color:#686a6b">Phone</td>
          <td style="padding:8px 12px;color:#0b0b0c">${payload.phone || "—"}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:bold;color:#686a6b;vertical-align:top">Message</td>
          <td style="padding:8px 12px;color:#0b0b0c;white-space:pre-wrap">${payload.message}</td>
        </tr>
      </table>
    </div>
  `

  await transporter.sendMail({
    from: `"Sedative Physio Website" <${process.env.SMTP_USER ?? ""}>`,
    to,
    replyTo: payload.email,
    subject: `Contact Form: ${payload.firstName} ${payload.lastName}`,
    html,
    text: `New Contact Form Submission\n\nName: ${payload.firstName} ${payload.lastName}\nEmail: ${payload.email}\nPhone: ${payload.phone || "—"}\nMessage:\n${payload.message}`,
  })
}
