import { useState, useSyncExternalStore } from "react"
import { ChevronDown, Loader2, Send } from "lucide-react"

/** Questions shown before the visitor opts into the rest, per breakpoint. */
const VISIBLE_FAQ_COUNT = 4
const VISIBLE_FAQ_COUNT_COMPACT = 2
/** Tailwind's `sm` breakpoint, below which the compact count applies. */
const COMPACT_QUERY = "(max-width: 639px)"

/**
 * Subscribes to a media query without an effect, so a phone rotation or window
 * resize re-renders without setState-in-effect.
 */
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

const faqs = [
  {
    question: "Are courses aligned with Physiotherapy university syllabus?",
    answer:
      "Yes. The modules are mapped against the standard BPT syllabus, so what you study lines up with what your college expects you to cover. Send me your university name and I'll point you at the exact unit mapping.",
  },
  {
    question: "Can I access courses on mobile?",
    answer:
      "Yes. Everything plays in a browser, so phone, tablet, and laptop all work. Lectures are downloadable, which means you can watch them on a commute without spending data.",
  },
  {
    question: "Are certifications recognized by hospitals?",
    answer:
      "Every course ends with a certificate you can put on your CV. Hospitals and clinics treat these as evidence of continuing professional development rather than as a formal licence, so how much weight it carries really comes down to the hiring department.",
  },
  {
    question: "What if I miss a live class?",
    answer:
      "Every live session is recorded and posted within a day. You get the recording and the notes either way, and you can send your questions in afterwards.",
  },
  {
    question: "Is there a free plan or trial?",
    answer:
      "Each course opens with a free preview module, so you can check the teaching style before paying for anything. Past that the courses are paid, one-off, with no subscription.",
  },
  {
    question: "Are courses available in Hindi as well as English?",
    answer:
      "Yes. The core material is in both Hindi and English, and live sessions run in whichever language the batch prefers. Captions are on for every recording.",
  },
]

const API_BASE = import.meta.env.VITE_API_URL ?? ""

export function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showAllFaqs, setShowAllFaqs] = useState(false)

  const isCompact = useMediaQuery(COMPACT_QUERY)
  const faqLimit = isCompact ? VISIBLE_FAQ_COUNT_COMPACT : VISIBLE_FAQ_COUNT

  const visibleFaqs = showAllFaqs ? faqs : faqs.slice(0, faqLimit)
  const hiddenFaqCount = faqs.length - visibleFaqs.length
  /** The toggle stays rendered while expanded so "Show less" is reachable. */
  const canToggleFaqs = faqs.length > faqLimit
  /**
   * Derived rather than reset in an effect: `openFaq` indexes the whole list, so
   * if the viewport resizes or the list collapses while a now-hidden row is open,
   * that row simply isn't open. Bound by what's actually rendered, not faqLimit.
   */
  const lastVisibleIndex = visibleFaqs.length - 1
  const openIndex = openFaq !== null && openFaq <= lastVisibleIndex ? openFaq : null

  function showMoreFaqs() {
    setShowAllFaqs(true)
  }

  function showFewerFaqs() {
    setShowAllFaqs(false)
    setOpenFaq(null)
  }

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
              <h1 className="text-[clamp(2rem,7vw,4.35rem)] font-bold leading-[1.01] tracking-[-0.04em]">
                Get In Touch
              </h1>
              <p className="mt-4 max-w-[320px] text-[15px] leading-[1.45] text-[#686a6b] sm:mt-6 sm:max-w-[540px] sm:text-lg">
                Have a question or want to learn more? Send me a message and I'll respond within 48 hours.
              </p>

              {/* Divider */}
              <div className="mt-6 h-px w-full bg-black/10 sm:mt-8" />

              {/* Contact details */}
              <address className="mt-6 not-italic sm:mt-8">
                <ul className="space-y-2 text-[15px] leading-relaxed text-[#686a6b] sm:space-y-3 sm:text-lg">
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
                <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
                  <label className="flex flex-col gap-0">
                    <span className="sr-only">Name</span>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Name"
                      autoComplete="name"
                      maxLength={100}
                      className="w-full rounded-xl border-2 border-black/20 bg-black/5 px-4 py-4 text-base sm:px-6 sm:py-5 text-[#0b0b0c] placeholder:text-[#686a6b] focus:border-black/40 focus:outline-none transition-colors"
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-0">
                    <span className="sr-only">Email</span>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Email"
                      autoComplete="email"
                      maxLength={254}
                      className="w-full rounded-xl border-2 border-black/20 bg-black/5 px-4 py-4 text-base sm:px-6 sm:py-5 text-[#0b0b0c] placeholder:text-[#686a6b] focus:border-black/40 focus:outline-none transition-colors"
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-0">
                    <span className="sr-only">Phone Number</span>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="Phone Number"
                      autoComplete="tel"
                      maxLength={32}
                      className="w-full rounded-xl border-2 border-black/20 bg-black/5 px-4 py-4 text-base sm:px-6 sm:py-5 text-[#0b0b0c] placeholder:text-[#686a6b] focus:border-black/40 focus:outline-none transition-colors"
                    />
                  </label>

                  <label className="flex flex-col gap-0">
                    <span className="sr-only">Message</span>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Message"
                      rows={4}
                      maxLength={5000}
                      className="w-full resize-none rounded-xl border-2 border-black/20 bg-black/5 px-4 py-4 text-base sm:px-6 sm:py-5 text-[#0b0b0c] placeholder:text-[#686a6b] focus:border-black/40 focus:outline-none transition-colors"
                      required
                    />
                  </label>

                  {error && <p className="text-sm text-[#8b4b42]">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-3 rounded-[15px] bg-[#0b0b0c] px-6 py-4 text-base sm:py-5 font-medium text-[#e9e9e8] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="size-[18px] animate-spin sm:size-5" /> : <Send className="size-[18px] sm:size-5" />}
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
              <h2 className="text-[clamp(1.75rem,6vw,4.1rem)] font-bold leading-none tracking-[-0.04em]">
                Frequently Asked Questions
              </h2>
            </div>

            <div>
              <ul id="faq-list" className="flex flex-col gap-4">
                {visibleFaqs.map((faq, index) => {
                const isOpen = openIndex === index
                const panelId = `faq-panel-${index}`
                const buttonId = `faq-button-${index}`
                // Rows past the initial cut animate in when they're revealed.
                const isRevealed = index >= faqLimit

                return (
                  <li
                    key={faq.question}
                    className={`overflow-hidden bg-[#f3f3f3] shadow-[0px_34px_45px_-20px_rgba(149,149,149,0.25)] transition-[border-radius] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                      isOpen ? "rounded-[32px]" : "rounded-[69px]"
                    } ${isRevealed ? "faq-reveal" : ""}`}
                    style={
                      isRevealed ? { animationDelay: `${(index - faqLimit) * 80}ms` } : undefined
                    }
                  >
                    <h3>
                      <button
                        type="button"
                        id={buttonId}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className={`flex w-full items-center gap-5 rounded-[inherit] px-7 text-left transition-[padding,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-[-5px] focus-visible:outline-[#0b0b0c] motion-reduce:transition-none ${
                          isOpen ? "py-[28px]" : "py-[38px]"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`relative flex size-7 shrink-0 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                            isOpen ? "rotate-45" : "rotate-0"
                          }`}
                        >
                          <span
                            className={`absolute block h-[5px] w-7 rounded-full transition-colors duration-300 motion-reduce:transition-none ${
                              isOpen ? "bg-[#0b0b0c]" : "bg-[#686a6b] opacity-80"
                            }`}
                          />
                          <span
                            className={`absolute block h-7 w-[5px] rounded-full transition-colors duration-300 motion-reduce:transition-none ${
                              isOpen ? "bg-[#0b0b0c]" : "bg-[#686a6b] opacity-80"
                            }`}
                          />
                        </span>
                        <span
                          className={`text-[15px] font-semibold leading-[1.3] transition-colors duration-300 motion-reduce:transition-none sm:text-[17px] ${
                            isOpen ? "text-[#0b0b0c]" : "text-[#686a6b]"
                          }`}
                        >
                          {faq.question}
                        </span>
                      </button>
                    </h3>

                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="px-7 pb-8">
                          <div aria-hidden="true" className="mb-6 h-px w-full bg-black/5" />
                          <p className="max-w-[68ch] text-[15px] leading-[1.6] text-[#686a6b] sm:text-base">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                )
                })}
              </ul>

              {canToggleFaqs && (
                <button
                  type="button"
                  onClick={showAllFaqs ? showFewerFaqs : showMoreFaqs}
                  aria-expanded={showAllFaqs}
                  aria-controls="faq-list"
                  className="mt-6 flex items-center gap-2 rounded-full border border-black/20 px-6 py-3 text-[15px] font-medium text-[#0b0b0c] transition-colors duration-200 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b0b0c] motion-reduce:transition-none"
                >
                  {showAllFaqs ? "Show less" : `Show ${hiddenFaqCount} more`}
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                      showAllFaqs ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
