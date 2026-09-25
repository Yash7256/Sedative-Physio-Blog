import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

/**
 * Split a display string like "1500+" or "4.9" into the parts a counter needs:
 * the numeric target, how many decimals to keep, and the affix to re-attach.
 * Returns null for anything non-numeric so a stray node is simply skipped.
 */
function splitValue(raw: string) {
  const match = /^(\d[\d.,]*)(.*)$/.exec(raw.trim())
  if (!match) return null
  const digits = match[1].replace(/,/g, "")
  const target = Number.parseFloat(digits)
  if (Number.isNaN(target)) return null
  const decimals = digits.includes(".") ? digits.split(".")[1].length : 0
  return { target, decimals, affix: match[2] }
}

/**
 * About stats count-up: every `[data-count]` figure inside the returned
 * container animates from 0 to its declared value the first time the block
 * scrolls into view, staggered left to right.
 *
 * The real value stays in the markup (`data-count="1500+"` plus the same text as
 * the element's children) so the figures are correct without JS — the effect
 * only takes over the text once it is running.
 *
 * Attach the ref to the wrapper around the numbers and put `data-count` on each
 * one. Respects prefers-reduced-motion by rendering the final value directly.
 */
export function useCountUp() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const entries = Array.from(root.querySelectorAll<HTMLElement>("[data-count]"))
      .map((node) => ({ node, ...splitValue(node.dataset.count ?? "") }))
      .filter((entry): entry is typeof entry & { target: number } => entry.target !== null)

    if (!entries.length) return

    if (window.matchMedia(REDUCED_MOTION).matches) {
      entries.forEach(({ node, target, decimals, affix }) => {
        node.textContent = target.toFixed(decimals) + affix
      })
      return
    }

    const ctx = gsap.context(() => {
      entries.forEach(({ node, target, decimals, affix }, index) => {
        const counter = { value: 0 }
        node.textContent = (0).toFixed(decimals) + affix
        gsap.to(counter, {
          value: target,
          duration: 1.6,
          ease: "power2.out",
          delay: index * 0.12,
          // Snap so the digits tick over cleanly instead of blurring past them.
          snap: { value: decimals ? 1 / 10 ** decimals : 1 },
          onUpdate: () => {
            node.textContent = counter.value.toFixed(decimals) + affix
          },
          scrollTrigger: { trigger: root, start: "top 85%", once: true },
        })
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return rootRef
}
