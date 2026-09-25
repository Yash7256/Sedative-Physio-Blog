import { useEffect, useRef } from "react"
import gsap from "gsap"

/**
 * Hero entrance animation: a word-by-word mask reveal on the title, followed by
 * a staggered fade-up for the badge, subtitle and CTA.
 *
 * Everything is scoped to the returned ref via `gsap.context()`, so all tweens
 * are reverted on unmount and the title is restored to its original text — that
 * way a re-mount animates again instead of replaying against stale spans.
 *
 * Attach the ref to the hero section; mark children with `data-hero-title` and
 * `data-hero-fade`.
 */
export function useHeroReveal() {
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = heroRef.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const title = el.querySelector<HTMLElement>("[data-hero-title]")
    // Store original text so cleanup can restore it for the next mount
    const originalText = title?.textContent ?? ""

    const ctx = gsap.context(() => {
      // Split the title into masked words once, on first mount
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
        { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: "power3.out", delay: 0.1 },
      )

      gsap.fromTo(
        el.querySelectorAll("[data-hero-fade]"),
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, stagger: 0.12, ease: "power3.out", delay: 0.35 },
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

  return heroRef
}
