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

  // Keep a stable reference so gsap.ticker.remove can match it exactly on cleanup
  const lenisRaf = (time: number) => lenis.raf(time * 1000)

  // Tick Lenis inside GSAP's RAF so ScrollTrigger stays in sync
  gsap.ticker.add(lenisRaf)
  gsap.ticker.lagSmoothing(0)

  // ── Scoped trigger registry — avoids nuking third-party ScrollTriggers ───
  const triggers: ScrollTrigger[] = []

  // ── Section scroll-fade (exit effect) ─────────────────────────────────────
  // Only target semantic <section> elements that are marked with data-scroll-fade.
  // We add this attribute in each page. Utility strips (marquee, trust bar) are excluded.
  // Using fromTo so re-entry after back-navigation always starts from a clean state.
  const scrollFadeSections = document.querySelectorAll<HTMLElement>("[data-scroll-fade]")
  scrollFadeSections.forEach((section) => {
    const st = ScrollTrigger.create({
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
    triggers.push(st)
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
    triggers.forEach((st) => st.kill())
    gsap.ticker.remove(lenisRaf)
    lenis.destroy()
  }
}
