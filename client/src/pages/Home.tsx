import { ArrowRight, Award, Quote } from "lucide-react"
import { Link } from "react-router-dom"
import { SmartImage } from "../components/SmartImage"
import { TestimonialCarousel, useHeroReveal } from "../components/home/animations"
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
  const heroRef = useHeroReveal()

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
                    src={`/mockup/bento${index + 1}.webp`}
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
              <SmartImage data-parallax src="/certificate.webp" alt="Course certificate" className="w-full object-cover" />
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
                src="/team/akshay.jpg"
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
