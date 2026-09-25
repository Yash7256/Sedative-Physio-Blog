import { useEffect, useRef } from "react"
import gsap from "gsap"

/**
 * About hero entrance: a single staggered fade-up for everything marked
 * `data-hero-fade` (the title, the intro line and the platform mockup).
 *
 * Scoped to the returned ref via `gsap.context()` so the tweens are reverted on
 * unmount. No word-splitting here — unlike the home hero, the About title is
 * short enough to read as a single block.
 *
 * Attach the ref to the hero section and mark children with `data-hero-fade`.
 */
export function useHeroReveal() {
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = heroRef.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-hero-fade]"),
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, stagger: 0.09, ease: "power3.out", delay: 0.1 },
      )
    }, el)

    return () => ctx.revert()
  }, [])

  return heroRef
}
