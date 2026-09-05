import { useState } from "react"
import { Loader2, Send } from "lucide-react"

const faqs = [
  { question: "Are courses aligned with Physiotherapy university syllabus?" },
  { question: "Can I access courses on mobile?" },
  { question: "Are certifications recognized by hospitals?" },
  { question: "What if I miss a live class?" },
  { question: "Is there a free plan or trial?" },
  { question: "Are courses available in Hindi as well as English?" },
]

const API_BASE = import.meta.env.VITE_API_URL ?? ""

export function Contact() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Failed to send message")
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="contact-page overflow-hidden bg-[#f6f6f4] text-[#0b0b0c]">
      {/* ── Hero + Form ── */}
      <section data-scroll-fade className="px-5 pb-20 pt-24 sm:px-10 sm:pt-32 lg:px-[76px] lg:pt-36">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-16 lg:grid-cols-[420px_1fr] lg:gap-20 xl:grid-cols-[520px_1fr]">

            {/* Left — heading + contact details */}
            <div data-reveal>
              <h1 className="text-[clamp(2.8rem,5vw,5rem)] font-bold leading-[0.95] tracking-[-0.04em]">
                Get In Touch
              </h1>
              <p className="mt-6 max-w-[540px] text-lg leading-[1.5] text-[#686a6b]">
                Have a question or want to learn more? Send me a message and I'll respond within 48 hours.
              </p>

              {/* Divider */}
              <div className="mt-8 h-px w-full bg-black/10" />

              {/* Contact details */}
              <address className="mt-8 not-italic">
                <ul className="space-y-3 text-lg leading-relaxed text-[#686a6b]">
                  <li>Bihar, India</li>
                  <li>
                    <a href="tel:+919060627610" className="transition-opacity hover:opacity-70">
                      +91 9060627610
                    </a>
                  </li>
                  <li>
                    <a href="mailto:sedativephysio@gmail.com" className="transition-opacity hover:opacity-70">
                      sedativephysio@gmail.com
                    </a>
                  </li>
                </ul>
              </address>
            </div>

            {/* Right — contact form */}
            <div data-reveal>
              {submitted ? (
                <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl bg-[rgba(11,11,12,0.04)] px-8 py-16 text-center">
                  <div>
                    <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-[#0b0b0c]">
                      <Send className="size-6 text-white" />
                    </div>
                    <p className="text-xl font-semibold tracking-tight">Message sent!</p>
                    <p className="mt-2 text-base text-[#686a6b]">I'll get back to you within 48 hours.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-0">
                      <span className="sr-only">Last Name</span>
                      <input
                        type="text"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="Last Name"
                        className="w-full rounded-xl border-2 border-black/20 bg-black/5 px-6 py-5 text-base text-[#0b0b0c] placeholder:text-[#686a6b] focus:border-black/40 focus:outline-none transition-colors"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-0">
                      <span className="sr-only">First Name</span>
                      <input
                        type="text"
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="First Name"
                        className="w-full rounded-xl border-2 border-black/20 bg-black/5 px-6 py-5 text-base text-[#0b0b0c] placeholder:text-[#686a6b] focus:border-black/40 focus:outline-none transition-colors"
                        required
                      />
                    </label>
                  </div>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                    className="w-full rounded-xl border-2 border-black/20 bg-black/5 px-6 py-5 text-base text-[#0b0b0c] placeholder:text-[#686a6b] focus:border-black/40 focus:outline-none transition-colors"
                    required
                  />

                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Phone Number"
                    className="w-full rounded-xl border-2 border-black/20 bg-black/5 px-6 py-5 text-base text-[#0b0b0c] placeholder:text-[#686a6b] focus:border-black/40 focus:outline-none transition-colors"
                  />

                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Message"
                    rows={5}
                    className="w-full resize-none rounded-xl border-2 border-black/20 bg-black/5 px-6 py-5 text-base text-[#0b0b0c] placeholder:text-[#686a6b] focus:border-black/40 focus:outline-none transition-colors"
                    required
                  />

                  {error && <p className="text-sm text-[#8b4b42]">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-3 rounded-[15px] bg-[#0b0b0c] px-6 py-5 text-base font-medium text-[#e9e9e8] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                    {submitting ? "Sending…" : "Submit Message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section data-scroll-fade className="px-5 pb-24 pt-8 sm:px-10 lg:px-[76px]">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-12 lg:grid-cols-[488px_1fr] lg:gap-20">
            <div className="lg:sticky lg:top-32 lg:self-start" data-reveal>
              <h2 className="text-[clamp(2.4rem,4.5vw,4.5rem)] font-bold leading-[1.0] tracking-[-0.04em]">
                Frequently Asked Questions
              </h2>
            </div>

            <ul className="flex flex-col gap-4">
              {faqs.map((faq) => (
                <li
                  key={faq.question}
                  className="flex items-center gap-5 rounded-[69px] bg-[#f3f3f3] px-7 py-[38px] shadow-[0px_34px_45px_-20px_rgba(149,149,149,0.25)]"
                >
                  <div className="relative shrink-0 size-7 flex items-center justify-center" aria-hidden="true">
                    <span className="absolute block h-[5px] w-7 rounded-full bg-[#686a6b] opacity-80" />
                    <span className="absolute block h-7 w-[5px] rounded-full bg-[#686a6b] opacity-80" />
                  </div>
                  <p className="text-[17px] font-semibold leading-[1.3] text-[#686a6b] sm:text-[19px]">
                    {faq.question}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
