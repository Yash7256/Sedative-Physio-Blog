/**
 * About page motion. Defined here and consumed by `pages/About.tsx`, which only
 * composes sections.
 *
 * Everything else animated on this page (the `data-scroll-fade` sections,
 * `data-reveal` items and `data-parallax` images) is driven by the shared
 * engine in `lib/animations.ts` off those attributes — there is no per-page
 * code to own.
 */
export { useCountUp } from "./useCountUp"
export { useHeroReveal } from "./useHeroReveal"
