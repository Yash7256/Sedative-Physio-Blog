/**
 * Home page motion. Everything animated on the landing page is defined here and
 * consumed by `pages/Home.tsx`, which only composes sections.
 *
 * Styles for these effects (`.testimonial-*`, `.hero-word-mask`) still live in
 * `index.css`; this folder holds the behaviour.
 */
export { TestimonialCarousel } from "./TestimonialCarousel"
export { useHeroReveal } from "./useHeroReveal"
