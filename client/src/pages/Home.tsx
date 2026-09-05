import { useEffect, useRef } from "react"
import { ArrowRight, Award, BadgeCheck, Quote, Star } from "lucide-react"
import { Link } from "react-router-dom"
import gsap from "gsap"
import { colleges, feedbacks } from "../lib/feedback"

const learningCards = [
  ["Courses", "100+ courses"],
  ["3D Anatomy Models", "100+ models"],
  ["Notes", "Handwritten notes"],
  ["AI Assistant", "Ask, revise, repeat"],
  ["Journal", "Learn from practice"],
  ["Podcast", "Clinical conversations"],
] as const

export function Home() {
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = heroRef.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    // ── Hero word-by-word reveal ───────────────────────────────────────────
    const title = el.querySelector<HTMLElement>("[data-hero-title]")
    // Store original text so cleanup can restore it for the next mount
    const originalText = title?.textContent ?? ""

    const ctx = gsap.context(() => {
      if (title && title.dataset.split !== "true") {
        const words = title.textContent!.trim().split(/\s+/)
        title.dataset.split = "true"
        title.innerHTML = words
          .map((word, i) => {
            const isAccent = i === words.length - 1
            return `<span class="hero-word-mask"><span class="hero-word${isAccent ? " hero-word--accent" : ""}">${word}</span></span>`
          })
          .join(" ")
      }

      gsap.fromTo(
        el.querySelectorAll(".hero-word"),
        { yPercent: 110, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: "power3.out", delay: 0.1 }
      )

      // ── Hero badge / subtitle / CTA fade-up ─────────────────────────────
      gsap.fromTo(
        el.querySelectorAll("[data-hero-fade]"),
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, stagger: 0.12, ease: "power3.out", delay: 0.35 }
      )
    }, el)

    return () => {
      ctx.revert()
      // Reset the split flag and restore original text so re-mount re-animates
      if (title) {
        title.dataset.split = ""
        title.textContent = originalText
      }
    }
  }, [])

  return (
    <div className="home-page overflow-hidden bg-[#f6f6f4] text-[#0b0b0c]">

      {/* ── Hero ── data-scroll-fade so it exits with blur+scale */}
      <section
        ref={heroRef}
        data-scroll-fade
        className="hero-fade relative overflow-hidden px-5 pb-12 pt-12 sm:px-10 sm:pb-16 lg:px-[52px] lg:pt-16"
      >
        <div className="mx-auto max-w-[1280px]">
          <p data-hero-fade className="flex items-center gap-2 text-sm font-medium text-[#686a6b] sm:text-base">
            <BadgeCheck className="size-5" /> Trusted by 600+ Physiotherapy students
          </p>
          <h1
            data-hero-title
            aria-label="Everything You Need to Learn Physiotherapy, Better."
            className="mt-8 max-w-[1040px] text-[clamp(2.55rem,4.2vw,4.35rem)] font-bold leading-[1.01] tracking-[-.04em]"
          >
            Everything You Need to Learn Physiotherapy, Better.
          </h1>
          <p data-hero-fade className="mt-6 max-w-[555px] text-base leading-[1.45] text-[#686a6b] sm:text-[18px]">
            Access expert-led courses, free study notes, 3D anatomy, videos, podcasts, practice tools and
            certifications, all in one place.
          </p>
          <Link
            data-hero-fade
            to="/about"
            className="group mt-8 inline-flex h-[60px] shrink-0 items-center justify-center gap-4 rounded-full bg-[#0b0b0c] px-8 text-base font-medium text-[#ececec] transition-transform hover:-translate-y-1 sm:h-[68px] sm:px-10 sm:text-lg"
          >
            Start Learning <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* ── College marquee strip — no scroll-fade, it's a utility band ── */}
      <section className="overflow-hidden border-y border-black/10 bg-[#dedfdd] py-6">
        <div className="marquee">
          <div className="marquee-track marquee-track-strip">
            {[0, 1].map((set) => (
              <div key={set} className="flex shrink-0 items-center gap-12 pr-12">
                {colleges.map((college) => (
                  <span key={`${college}-${set}`} className="whitespace-nowrap text-sm text-[#686a6b]">
                    {college}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust bar — no scroll-fade ── */}
      <section className="bg-[#0b0b0c] px-5 py-10 text-[#ececec] sm:px-10 lg:px-[52px]">
        <div className="mx-auto flex max-w-[1060px] flex-col items-center justify-center gap-7 sm:flex-row sm:gap-10">
          <div className="flex -space-x-3">
            {["trust1", "trust2", "trust3", "trust4"].map((src) => (
              <img
                key={src}
                src={`/${src}.png`}
                alt=""
                className="size-14 rounded-full border-2 border-[#0b0b0c] object-cover"
              />
            ))}
          </div>
          <div className="hidden h-16 w-px bg-white/25 sm:block" />
          <div className="text-center sm:text-left">
            <p className="text-lg font-medium sm:text-xl">Trusted by 600+ Physiotherapy students</p>
            <p className="mt-2 flex items-center justify-center gap-2 text-base text-[#d4d4d4] sm:justify-start">
              <Star className="size-5 fill-[#f2c46d] text-[#f2c46d]" /> 4.8/5 average rating
            </p>
          </div>
        </div>
      </section>

      {/* ── Learn Your Way ── */}
      <section data-scroll-fade className="px-5 py-16 sm:px-10 sm:py-24 lg:px-[52px]">
        <div className="mx-auto max-w-[1280px]">
          <h2 data-reveal className="text-[clamp(2.5rem,4.2vw,4.1rem)] font-bold leading-none tracking-[-.04em]">
            Learn Your Way
          </h2>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {learningCards.map(([title, detail], index) => (
              <article key={title} data-reveal>
                <div className="aspect-square w-full overflow-hidden rounded-[18px]">
                  <img
                    data-parallax
                    src={`/bento${index + 1}.png`}
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h3 className="mt-4 text-xl font-medium tracking-[-.03em]">{title}</h3>
                <p className="mt-1 text-base text-[#686a6b]">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Certificate ── */}
      <section data-scroll-fade className="border-y border-black/10 bg-[#ebebeb] px-5 py-16 sm:px-10 sm:py-24 lg:px-[52px]">
        <div className="mx-auto grid max-w-[1280px] items-center gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div data-reveal>
            <h2 className="max-w-[620px] text-[clamp(2.5rem,4.3vw,4.1rem)] font-bold leading-[1.04] tracking-[-.04em]">
              Turn What You Learn Into Proof
            </h2>
            <p className="mt-6 max-w-[530px] text-lg leading-[1.45] text-[#686a6b]">
              Finish focused courses, test your knowledge, and collect a certificate that makes your progress
              visible.
            </p>
            <Link
              to="/about"
              className="group mt-8 inline-flex h-[62px] items-center gap-4 rounded-full bg-[#0b0b0c] px-8 text-lg font-medium text-[#ececec] transition-transform hover:-translate-y-1"
            >
              Explore Course <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="mx-auto w-full max-w-[590px]" data-reveal>
            <div className="overflow-hidden rounded-[18px]">
              <img data-parallax src="/certificate.png" alt="Course certificate" className="w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Dr. Akshay ── */}
      <section data-scroll-fade className="px-5 py-16 sm:px-10 sm:py-24 lg:px-[52px]">
        <div className="mx-auto grid max-w-[1280px] overflow-hidden rounded-[22px] bg-[#0b0b0c] lg:grid-cols-[.9fr_.75fr_1.05fr]">
          <div className="flex min-h-[340px] flex-col justify-between p-8 text-[#ececec] sm:p-11" data-reveal>
            <p className="max-w-[260px] text-base uppercase leading-[1.1] tracking-[.08em]">
              Why we built
              <br />
              Sedative Physio
            </p>
            <div>
              <Quote className="mb-5 size-14 text-[#3c3c3c]" fill="currentColor" strokeWidth={0} />
              <h2 className="text-[clamp(1.8rem,2.5vw,2.8rem)] font-bold tracking-[-.04em]">
                Dr. Akshay Kumar, PT
              </h2>
              <p className="mt-2 text-sm text-[#bcbcbc]">Physiotherapist &amp; Educator</p>
            </div>
          </div>
          <div className="h-full overflow-hidden">
            <img
              data-parallax
              src="/akshay.png"
              alt="Dr. Akshay Kumar"
              className="h-full min-h-[340px] w-full object-cover object-center"
            />
          </div>
          <div className="flex min-h-[340px] items-center bg-[#f0f0ef] p-8 sm:p-11" data-reveal>
            <p className="max-w-[410px] text-base leading-[1.55] text-[#3e3f40]">
              With years of clinical experience across musculoskeletal, neurological and sports physiotherapy,
              Dr. Akshay Kumar founded Sedative Physio to bridge clinical practice and accessible education. The
              platform helps students master complex subjects with structured courses, 3D models, notes and
              practical insight.
            </p>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section data-scroll-fade className="border-t border-black/10 px-5 py-16 sm:px-10 sm:py-24 lg:px-[52px]">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-wrap items-end justify-between gap-5" data-reveal>
            <h2 className="text-[clamp(2.5rem,4.3vw,4.1rem)] font-bold leading-none tracking-[-.04em]">
              What Our Students Say
            </h2>
            <p className="flex items-center gap-2 text-base text-[#686a6b]">
              <Award className="size-5" /> 4.8/5 average rating
            </p>
          </div>
          <div className="mt-12 flex items-stretch gap-10 overflow-hidden [-webkit-mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="marquee-track marquee-track-cards">
              {[0, 1].map((set) => (
                <div key={set} className="flex shrink-0 items-stretch gap-5 pr-5">
                  {feedbacks.map((feedback) => (
                    <article
                      key={`${set}-${feedback.name}`}
                      className="relative w-[min(92vw,580px)] shrink-0 rounded-[16px] bg-white p-4 sm:w-[560px] sm:p-5"
                    >
                      <Quote className="size-5 text-[#0b0b0c]" fill="currentColor" strokeWidth={0} />
                      <p className="mt-2 text-base leading-[1.4] text-[#686a6b]">"{feedback.quote}"</p>
                      <p className="mt-2 text-sm font-medium">{feedback.name}</p>
                      <p className="mt-0.5 text-xs text-[#686a6b]">
                        {[feedback.college, feedback.location]
                          .filter((part): part is string => Boolean(part))
                          .join(" · ")}
                      </p>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
