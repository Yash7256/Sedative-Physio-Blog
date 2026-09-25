import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, Award, ChevronLeft, ChevronRight, Quote, Star } from "lucide-react"
import { Link } from "react-router-dom"
import gsap from "gsap"
import { SmartImage } from "../components/SmartImage"
import { colleges, feedbacks, type Feedback } from "../lib/feedback"

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
          .map((word) => `<span class="hero-word-mask"><span class="hero-word">${word}</span></span>`)
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
        className="hero-fade relative overflow-hidden px-5 pb-10 pt-10 sm:px-10 sm:pb-16 lg:px-[52px] lg:pt-16"
      >
        <div className="mx-auto max-w-[1280px]">
          <p data-hero-fade className="flex items-center gap-1.5 text-[10px] font-medium text-[#686a6b] sm:text-sm sm:gap-2 md:text-base">
            <img src="/icons/verify.svg" alt="" className="size-[13px] sm:size-5" /> Trusted by 600+ Physiotherapy students
          </p>
          <h1
            data-hero-title
            aria-label="Everything You Need to Learn Physiotherapy, Better."
            className="mt-5 max-w-[1040px] text-[clamp(2rem,7vw,4.35rem)] font-bold leading-[1.01] tracking-[-.04em] sm:mt-8"
          >
            Everything You Need to Learn Physiotherapy, Better.
          </h1>
          <p data-hero-fade className="mt-4 max-w-[320px] text-[10px] leading-[1.45] text-[#686a6b] sm:mt-6 sm:max-w-[555px] sm:text-base md:text-[18px]">
            Access expert-led courses, free study notes, 3D anatomy, videos, podcasts, practice tools and
            certifications, all in one place.
          </p>
          <Link
            data-hero-fade
            to="/about"
            className="group mt-6 inline-flex h-[38px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#0b0b0c] px-5 text-[10px] font-medium text-[#ececec] transition-transform hover:-translate-y-1 sm:mt-8 sm:h-[60px] sm:gap-4 sm:px-8 sm:text-base md:h-[68px] md:px-10 md:text-lg"
          >
            Start Learning <ArrowRight className="size-[10px] transition-transform group-hover:translate-x-1 sm:size-5" />
          </Link>
        </div>
      </section>

      {/* ── College marquee strip — no scroll-fade, it's a utility band ── */}
      <section className="overflow-hidden border-y border-black/10 bg-[#dedfdd] py-3 sm:py-6">
        <div className="marquee">
          <div className="marquee-track marquee-track-strip">
            {[0, 1].map((set) => (
              <div key={set} className="flex shrink-0 items-center gap-6 pr-6 sm:gap-12 sm:pr-12">
                {colleges.map((college) => (
                  <span key={`${college}-${set}`} className="whitespace-nowrap text-[10px] text-[#686a6b] sm:text-xs">
                    {college}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust bar — no scroll-fade ── */}
      <section className="hidden bg-[#0b0b0c] px-5 py-10 text-[#ececec] sm:px-10 md:block lg:px-[52px]">
        <div className="mx-auto flex max-w-[1060px] flex-col items-center justify-center gap-7 sm:flex-row sm:gap-10">
          <div className="flex -space-x-3">
            {["trust1", "trust2", "trust3", "trust4"].map((src) => (
              <SmartImage
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
        
            </p>
          </div>
        </div>
      </section>

      {/* ── Learn Your Way ── */}
      <section data-scroll-fade className="px-5 py-12 sm:px-10 sm:py-24 lg:px-[52px]">
        <div className="mx-auto max-w-[1280px]">
          <h2 data-reveal className="text-[clamp(1.75rem,6vw,4.1rem)] font-bold leading-none tracking-[-.04em]">
            Learn Your Way
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:mt-10 sm:gap-x-8 sm:gap-y-10 xl:grid-cols-3">
            {learningCards.map(([title, detail], index) => (
              <article key={title} data-reveal>
                <div className="aspect-square w-full overflow-hidden rounded-[12px] sm:rounded-[18px]">
                  <SmartImage
                    data-parallax
                    src={`/bento${index + 1}.png`}
                    alt={title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h3 className="mt-2 text-sm font-medium tracking-[-.03em] sm:mt-4 sm:text-xl">{title}</h3>
                <p className="mt-0.5 text-xs text-[#686a6b] sm:mt-1 sm:text-base">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Certificate ── */}
      <section data-scroll-fade className="border-y border-black/10 bg-[#ebebeb] px-5 py-12 sm:px-10 sm:py-24 lg:px-[52px]">
        <div className="mx-auto grid max-w-[1280px] items-center gap-8 lg:grid-cols-[.9fr_1.1fr] lg:gap-10">
          <div data-reveal>
            <h2 className="max-w-[620px] text-[clamp(1.75rem,6vw,4.1rem)] font-bold leading-[1.04] tracking-[-.04em]">
              Turn What You Learn Into Proof
            </h2>
            <p className="mt-4 max-w-[530px] text-sm leading-[1.45] text-[#686a6b] sm:mt-6 sm:text-lg">
              Finish focused courses, test your knowledge, and collect a certificate that makes your progress
              visible.
            </p>
          </div>
          <div className="mx-auto w-full max-w-[590px]" data-reveal>
            <div className="overflow-hidden rounded-[14px] sm:rounded-[18px]">
              <SmartImage data-parallax src="/certificate.png" alt="Course certificate" className="w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Dr. Akshay ── */}
      <section data-scroll-fade className="px-5 py-12 sm:px-10 sm:py-24 lg:px-[52px]">
        <div className="mx-auto max-w-[1280px] overflow-hidden rounded-[16px] bg-[#0b0b0c] sm:rounded-[22px] lg:grid lg:grid-cols-[.9fr_.75fr_1.05fr]">

          {/* Mobile: 2-col side-by-side. Desktop: single column inside the 3-col grid */}
          <div className="grid grid-cols-2 lg:contents">

            {/* Left dark panel */}
            <div className="flex min-h-[220px] flex-col justify-between p-5 text-[#ececec] sm:min-h-[340px] sm:p-11" data-reveal>
              <p className="text-[10px] uppercase leading-[1.2] tracking-[.08em] text-[#bcbcbc] sm:text-base">
                Why we built
                <br />
                Sedative Physio
              </p>
              <div>
                <Quote className="mb-2 size-8 text-[#3c3c3c] sm:mb-5 sm:size-14" fill="currentColor" strokeWidth={0} />
                <h2 className="text-[clamp(1rem,4vw,2.8rem)] font-bold leading-[1.05] tracking-[-.04em]">
                  Dr. Akshay Kumar PT
                </h2>
                <p className="mt-1 text-[10px] text-[#bcbcbc] sm:mt-2 sm:text-sm">Physiotherapist &amp; Educator</p>
              </div>
            </div>

            {/* Photo panel */}
            <div className="min-h-[220px] overflow-hidden sm:min-h-[340px]">
              <SmartImage
                data-parallax
                src="/akshay.png"
                alt="Dr. Akshay Kumar"
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>

          {/* Quote text — hidden on mobile, visible on desktop (3rd column) */}
          <div className="hidden items-center bg-[#f0f0ef] p-6 sm:min-h-[340px] sm:p-11 lg:flex" data-reveal>
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
      <section data-scroll-fade className="overflow-hidden border-t border-black/10 py-12 sm:py-24">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-10 lg:px-[52px]">
          <div className="flex flex-wrap items-end justify-between gap-4" data-reveal>
            <h2 className="text-[clamp(1.75rem,6vw,4.1rem)] font-bold leading-none tracking-[-.04em]">
              What Our Students Say
            </h2>
            <p className="flex items-center gap-2 text-xs text-[#686a6b] sm:text-base">
              <Award className="size-4 sm:size-5" /> 4.8/5 average rating
            </p>
          </div>
        </div>
        <TestimonialCarousel feedbacks={feedbacks} />
      </section>
    </div>
  )
}

/* ── Testimonial Carousel ──────────────────────────────────────── */

const AUTO_MS = 5200
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/**
 * A single horizontal row of wide, short testimonial cards. Native scroll-snap
 * does the sliding (so touch swipe and trackpads work for free) and three
 * identical copies of the row give the band somewhere to scroll forever: the
 * window is parked in the middle copy and the dot index wraps modulo pages.
 *
 * `--t-basis` (clamped px) sets the card width, so 4-5 cards sit across a
 * desktop viewport with the first and last ones clipped by the scrollport.
 * `--t-per` is how many cards a page advances and always divides the 12
 * rendered cards, which keeps every page position canonical for the loop.
 */
function TestimonialCarousel({ feedbacks }: { feedbacks: Feedback[] }) {
  const items = useMemo(
    () => feedbacks.filter((f) => f.quote.trim().length > 10).slice(0, 12),
    [feedbacks],
  )
  const total = items.length

  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const metricsRef = useRef({ a1: 0, seg: 0, stride: 0, step: 0, per: 1, bleed: 0, vpW: 0 })
  const pageRef = useRef(0)
  const rafRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedRef = useRef(false)

  const [perView, setPerView] = useState(1)
  const [page, setPage] = useState(0)
  const [center, setCenter] = useState(0)
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )

  const pages = Math.max(1, Math.ceil(total / perView))

  useEffect(() => {
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track || !viewport) return

    const measure = () => {
      // The cards live inside three `display:contents` copies, so they have to
      // be queried — track.children only yields the three copy wrappers.
      const kids = track.querySelectorAll<HTMLElement>(".testimonial-card")
      if (kids.length < total * 3) return

      const per = parseInt(getComputedStyle(track).getPropertyValue("--t-per"), 10)
      const perSafe = Number.isFinite(per) && per > 0 ? per : 1
      const step = kids[1].offsetLeft - kids[0].offsetLeft
      if (!step) return
      const a1 = kids[total].offsetLeft
      const seg = kids[total * 2].offsetLeft - a1
      const vpW = viewport.clientWidth

      /* Cut the leading card off by the viewport edge, as in the reference
         composition, but never further than the slack a full page leaves over.
         scroll-padding is moved to match so snap points stay on card edges. */
      const bleed = Math.min(step * 0.5, Math.max(0, vpW - perSafe * step))
      viewport.style.scrollPaddingLeft = `${bleed}px`

      metricsRef.current = { a1, seg, stride: perSafe * step, step, per: perSafe, bleed, vpW }
      setPerView(perSafe)

      const kept = clamp(pageRef.current, 0, Math.max(0, Math.ceil(total / perSafe) - 1))
      pageRef.current = kept
      const left = a1 - bleed + kept * perSafe * step
      viewport.scrollTo({ left, behavior: "auto" })
      setCenter((left + vpW / 2) / step - 0.5)
      setPage(kept)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(viewport)
    return () => ro.disconnect()
  }, [total])

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setReduced(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  /* Nudge the band back inside the middle copy. The copies are identical, so
     the correction is invisible; the dot index just wraps. */
  const sync = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const { a1, seg, stride, step, bleed, vpW } = metricsRef.current
    if (!step) return

    const anchor = a1 - bleed
    /* A whole copy of runway sits to the left, so the scrollport's own 0 clamp
       covers the backward loop and the modulo keeps the dot honest. Only the
       far end needs pulling home. */
    const hi = anchor + seg
    let left = viewport.scrollLeft
    if (left > hi) {
      left -= seg
      viewport.scrollTo({ left, behavior: "auto" })
    }

    setCenter((left + vpW / 2) / step - 0.5)
    const raw = Math.round((left - anchor) / stride)
    const next = ((raw % pages) + pages) % pages
    pageRef.current = next
    setPage(next)
  }, [pages])

  const onScroll = () => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      sync()
    })
  }

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  const scrollBehavior: ScrollBehavior = reduced ? "auto" : "smooth"

  const schedule = useCallback(() => {
    clearTimer()
    if (reduced || pausedRef.current) return
    // A repeating interval, not a one-shot timeout — a timeout only advanced a
    // single page and then the carousel sat still until the user touched it.
    // The smooth glide is ~620ms, well inside AUTO_MS, so ticks never overlap.
    timerRef.current = setInterval(() => {
      const viewport = viewportRef.current
      if (!viewport) return
      viewport.scrollTo({
        left: viewport.scrollLeft + metricsRef.current.stride,
        behavior: reduced ? "auto" : "smooth",
      })
    }, AUTO_MS)
  }, [clearTimer, reduced])

  const pause = useCallback(() => {
    pausedRef.current = true
    clearTimer()
  }, [clearTimer])

  const resume = useCallback(() => {
    pausedRef.current = false
    schedule()
  }, [schedule])

  useEffect(() => {
    schedule()
    return clearTimer
  }, [schedule, clearTimer])

  /* Advance relative to the real scroll offset, not the page number, so the
     wrap stays seamless: past the last page we step into the next copy, which
     holds the same cards as page 0, and sync() rebases it home invisibly. */
  const nudge = useCallback(
    (dir: 1 | -1) => {
      const viewport = viewportRef.current
      if (!viewport) return
      const { a1, seg, stride, bleed } = metricsRef.current
      const anchor = a1 - bleed
      const last = pageRef.current === pages - 1

      /* Snap a possibly half-finished scroll back onto a page boundary before
         stepping, so fast repeated clicks always advance exactly one page. */
      const raw = Math.round((viewport.scrollLeft - anchor) / stride)
      const settled = anchor + raw * stride
      let target = settled + dir * stride
      if (dir === 1 && last) target = anchor + seg
      if (target < 0) {
        viewport.scrollTo({ left: settled + seg, behavior: "auto" })
        target = settled + seg + dir * stride
      }
      viewport.scrollTo({ left: target, behavior: scrollBehavior })
      schedule()
    },
    [schedule, scrollBehavior, pages],
  )

  const goTo = (index: number) => {
    const viewport = viewportRef.current
    if (!viewport) return
    const { a1, stride, bleed } = metricsRef.current
    viewport.scrollTo({ left: a1 - bleed + index * stride, behavior: scrollBehavior })
    schedule()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      nudge(1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      nudge(-1)
    }
  }

  if (!total) return null

  return (
    <div
      className="mt-8 sm:mt-10"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={resume}
    >
      {/* Edge-clipped band — the section itself has no inline padding, so this
          row runs the full viewport width and the outer cards get cut off. */}
      <div
        ref={viewportRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Student testimonials"
        tabIndex={0}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        className="testimonial-scroller overflow-x-auto overflow-y-hidden py-3 sm:py-4"
      >
        <div ref={trackRef} className="testimonial-track flex px-5 sm:px-10 lg:px-[51px]">
          {[0, 1, 2].map((copy) => (
            <div key={copy} aria-hidden={copy !== 1} className="contents">
              {items.map((feedback, k) => {
                const d = copy * total + k - center
                const ad = Math.abs(d)
                /* Every card leans a couple of degrees, alternating against its
                   neighbour, with only a slight extra arc towards the edges —
                   so the row reads as tilted print, not a collapsing funnel. */
                const rot = clamp(
                  clamp(d * 0.6, -1.2, 1.2) + (k % 2 === 0 ? 2.2 : -2.2),
                  -4,
                  4,
                )
                const scale = ad === 0 ? 1 : ad < 1.5 ? 0.98 : 0.955
                const meta =
                  [feedback.college, feedback.location].filter(Boolean).join(" · ") ||
                  "Physiotherapy student"

                return (
                  <article
                    key={`${copy}-${k}`}
                    className="testimonial-card relative flex flex-col overflow-hidden rounded-[20px] border bg-white p-5"
                    style={{
                      transform: `rotate(${rot}deg) scale(${scale})`,
                      zIndex: 100 - Math.round(ad * 10),
                      opacity: clamp(1.14 - ad * 0.16, 0.4, 1),
                      transition: `transform 620ms ${EASE}, opacity 620ms ${EASE}`,
                    }}
                  >
                    <header className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className="testimonial-avatar grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
                      >
                        {feedback.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="font-display truncate text-[12.5px] font-bold leading-tight tracking-[-.02em] text-[#0b0b0c]">
                          {feedback.name}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] leading-tight text-[#686a6b]">
                          {meta}
                        </p>
                      </div>
                    </header>

                    <blockquote className="testimonial-quote mt-3 flex-1 text-[12.5px] leading-[1.45] text-[#0b0b0c]">
                      {feedback.quote}
                    </blockquote>

                    <div className="mt-2 flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          aria-hidden
                          className="size-2.5 fill-[#f2c46d] text-[#f2c46d]"
                        />
                      ))}
                      <span className="sr-only">Rated 5 out of 5</span>
                    </div>
                  </article>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="mx-auto mt-4 flex max-w-[1280px] items-center justify-between px-5 sm:px-10 lg:px-[51px]">
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Previous testimonials"
          className="testimonial-nav grid size-9 place-items-center rounded-full border transition-colors"
        >
          <ChevronLeft className="size-3.5" />
        </button>

        <div className="flex items-center gap-2">
          {Array.from({ length: pages }).map((_, p) => (
            <button
              key={p}
              type="button"
              onClick={() => goTo(p)}
              aria-label={`Go to testimonials ${p + 1} of ${pages}`}
              aria-current={p === page}
              data-active={p === page}
              className="testimonial-dot h-1.5 w-1.5 rounded-full transition-all duration-300"
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="Next testimonials"
          className="testimonial-nav grid size-9 place-items-center rounded-full border transition-colors"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
