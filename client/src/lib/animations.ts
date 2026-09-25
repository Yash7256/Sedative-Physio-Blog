/**
 * Shared GSAP + Lenis animation setup.
 *
 * Call `initPageAnimations()` once after the DOM is ready (Layout useEffect).
 * Returns a cleanup function that kills all ScrollTriggers and destroys Lenis.
 */

import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Lenis from "lenis"

gsap.registerPlugin(ScrollTrigger)

/**
 * The Lenis instance for the current page, or null when smooth scroll is off
 * (reduced motion, or between routes). Exposed so navigation code can drive
 * scroll through Lenis instead of fighting it with window.scrollTo.
 */
let activeLenis: Lenis | null = null

/**
 * Scroll the window to the top of the page.
 *
 * Route changes must use `immediate` — the new page has just mounted, so
 * animating would show the previous page's scroll offset sweeping away. A
 * deliberate "back to top" tap wants the smooth glide instead.
 */
export function scrollToTop(smooth = false): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (activeLenis && !reduced) {
    activeLenis.scrollTo(0, { immediate: !smooth, force: true })
  } else {
    window.scrollTo({ top: 0, left: 0, behavior: smooth && !reduced ? "smooth" : "auto" })
  }
}

export function initPageAnimations(): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {}
  }

  // ── Lenis smooth scroll ────────────────────────────────────────────────────
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  })
  activeLenis = lenis

  // Keep a stable reference so gsap.ticker.remove can match it exactly on cleanup
  const lenisRaf = (time: number) => lenis.raf(time * 1000)

  // Tick Lenis inside GSAP's RAF so ScrollTrigger stays in sync
  gsap.ticker.add(lenisRaf)
  gsap.ticker.lagSmoothing(0)

  // ── Scoped trigger registry — avoids nuking third-party ScrollTriggers ───
  const triggers: ScrollTrigger[] = []

  // ── Section scroll-fade (exit effect) ─────────────────────────────────────
  // Only semantic <section> elements marked data-scroll-fade. Utility strips
  // (marquee, trust bar) are excluded. Using fromTo so re-entry after
  // back-navigation always starts from a clean state.
  //
  // Desktop + fine pointer only. This scrubs a blur filter across a whole
  // section every frame, which is costly to composite on small or touch
  // screens — and on a phone it just smears the content being scrolled.
  // matchMedia reverts the whole context when the query stops matching, so
  // resizing across the breakpoint swaps the effect on and off live.
  const mm = gsap.matchMedia()

  mm.add("(min-width: 1024px) and (pointer: fine)", () => {
    document.querySelectorAll<HTMLElement>("[data-scroll-fade]").forEach((section) => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom 20%",
        scrub: 0.5,
        animation: gsap.fromTo(
          section,
          { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
          { opacity: 0.35, y: -60, scale: 0.98, filter: "blur(6px)", ease: "none" }
        ),
      })
    })
  })

  // ── Image parallax ────────────────────────────────────────────────────────
  // All images with data-parallax attribute
  const parallaxImages = document.querySelectorAll<HTMLElement>("[data-parallax]")
  parallaxImages.forEach((img) => {
    const tl = gsap.timeline()
      .fromTo(img, { scale: 1.14 }, { scale: 1, ease: "none", duration: 0.5 })
      .to(img, { scale: 1.14, ease: "none", duration: 0.5 })
    const st = ScrollTrigger.create({
      trigger: img,
      start: "top bottom",
      end: "bottom top",
      scrub: 0.5,
      animation: tl,
    })
    triggers.push(st)
  })

  // ── Section entrance animations ──────────────────────────────────────────
  // All elements with data-reveal attribute fade up as they enter the viewport
  const revealEls = document.querySelectorAll<HTMLElement>("[data-reveal]")
  revealEls.forEach((el) => {
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      toggleActions: "play none none none",
      animation: gsap.fromTo(
        el,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, ease: "power3.out" }
      ),
    })
    triggers.push(st)
  })

  // ── Cleanup ───────────────────────────────────────────────────────────────
  return () => {
    activeLenis = null
    mm.revert()
    triggers.forEach((st) => st.kill())
    gsap.ticker.remove(lenisRaf)
    lenis.destroy()
  }
}
