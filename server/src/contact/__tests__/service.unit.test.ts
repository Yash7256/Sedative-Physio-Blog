import { beforeEach, describe, expect, it, vi } from "vitest"

const sendMail = vi.fn().mockResolvedValue({ messageId: "test" })

vi.mock("../../lib/email.js", () => ({
  transporter: { sendMail },
}))

const { sendContactEmail } = await import("../service.js")

const VALID_PAYLOAD = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+91 9060627610",
  message: "I'd like to book a session.",
}

function sentMail() {
  expect(sendMail).toHaveBeenCalledTimes(1)
  return sendMail.mock.calls[0]![0] as {
    to: string
    replyTo: string
    subject: string
    html: string
    text: string
  }
}

describe("sendContactEmail", () => {
  beforeEach(() => {
    sendMail.mockClear()
    delete process.env.SMTP_USER
    delete process.env.CONTACT_EMAIL
  })

  it("does not attempt delivery when SMTP is unconfigured, and does not throw", async () => {
    await expect(sendContactEmail(VALID_PAYLOAD)).resolves.toBeUndefined()
    expect(sendMail).not.toHaveBeenCalled()
  })

  it("sends to the CONTACT_EMAIL override when SMTP is configured", async () => {
    process.env.SMTP_USER = "mailer@example.com"
    process.env.CONTACT_EMAIL = "clinic@example.com"

    await sendContactEmail(VALID_PAYLOAD)

    expect(sentMail().to).toBe("clinic@example.com")
  })

  it("falls back to the default inbox when CONTACT_EMAIL is unset", async () => {
    process.env.SMTP_USER = "mailer@example.com"

    await sendContactEmail(VALID_PAYLOAD)

    expect(sentMail().to).toBe("sedativephysio@gmail.com")
  })

  it("sets replyTo to the submitter so Reply goes to them", async () => {
    process.env.SMTP_USER = "mailer@example.com"

    await sendContactEmail(VALID_PAYLOAD)

    expect(sentMail().replyTo).toBe("ada@example.com")
  })

  it("escapes HTML in every interpolated field", async () => {
    process.env.SMTP_USER = "mailer@example.com"

    await sendContactEmail({
      name: '<script>alert(1)</script>"><img src=x onerror=alert(2)>',
      email: "ada@example.com",
      phone: "<b>555</b>",
      message: "<script>alert(3)</script>",
    })

    const { html } = sentMail()

    expect(html).not.toContain("<script>")
    expect(html).not.toContain("<img")
    expect(html).not.toContain("<b>")
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
    expect(html).toContain("&lt;script&gt;alert(3)&lt;/script&gt;")
  })

  it("escapes an email-shaped payload so the mailto link cannot be broken out of", async () => {
    process.env.SMTP_USER = "mailer@example.com"

    await sendContactEmail({
      ...VALID_PAYLOAD,
      email: 'a@b.co"><script>alert(4)</script>',
    })

    const { html } = sentMail()

    expect(html).not.toContain("<script>")
    expect(html).toContain("&quot;")
  })

  it("collapses newlines in the subject so it cannot split the header", async () => {
    process.env.SMTP_USER = "mailer@example.com"

    await sendContactEmail({
      ...VALID_PAYLOAD,
      name: "Ada\r\nBcc: victim@example.com",
    })

    const { subject } = sentMail()

    expect(subject).toBe("Contact Form: Ada Bcc: victim@example.com")
  })

  it("keeps the plain-text part unescaped and newline-preserving", async () => {
    process.env.SMTP_USER = "mailer@example.com"

    await sendContactEmail({ ...VALID_PAYLOAD, message: "line one\nline two" })

    expect(sentMail().text).toContain("line one\nline two")
  })
})
