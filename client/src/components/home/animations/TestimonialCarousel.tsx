import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import type { Feedback } from "@/lib/feedback"

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
 *
 * Sizing, rotation, avatar and dot styles come from `.testimonial-*` in
 * `index.css`; the per-card transform here is what actually does the motion.
 */
export function TestimonialCarousel({ feedbacks }: { feedbacks: Feedback[] }) {
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
