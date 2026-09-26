import { useEffect, useRef } from "react"
import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import gsap from "gsap"
import { useCountUp } from "../components/about/animations"
import { SmartImage } from "../components/SmartImage"


const stats = [
  { value: "600+", label: "Students Enrolled" },
  { value: "1500+", label: "Hours Of Content" },
  { value: "4.9", label: "Average Course Rating" },
]

const offerItems = [
  { title: "Courses", detail: "100+ courses", img: "/mockup/bento1.webp" },
  { title: "3D Anatomy Models", detail: "100+ Models", img: "/mockup/bento2.webp" },
  { title: "Notes", detail: "Handwritten Notes", img: "/mockup/bento3.webp" },
  { title: "AI Assistant", detail: "Clear Your Doubts 24/7", img: "/mockup/bento4.webp" },
  { title: "Journal", detail: "100+ Journals", img: "/mockup/bento5.webp" },
  { title: "Podcast", detail: "World Class Physiotherapists", img: "/mockup/bento6.webp" },
]


export function About() {
  const heroRef = useRef<HTMLDivElement>(null)
  const statsRef = useCountUp()

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

  return (
    <div className="about-page overflow-hidden bg-[#f6f6f4] text-[#0b0b0c]">

      {/* ── Hero ── */}
      <section
        ref={heroRef}
        data-scroll-fade
        className="hero-fade relative px-5 pb-10 pt-8 sm:px-10 lg:px-[52px]"
      >
        <div className="mx-auto max-w-[1280px]">
          <h1
            data-hero-fade
            className="text-[clamp(2rem,7vw,4.35rem)] font-bold leading-[1.01] tracking-[-.04em]"
          >
            About Us
          </h1>
          <p
            data-hero-fade
            className="mt-4 max-w-[320px] text-[10px] leading-[1.45] text-[#686a6b] sm:mt-6 sm:max-w-[555px] sm:text-base md:text-[18px]"
          >
            We bring courses, clinical resources, 3D anatomy models, journals, podcasts, and AI-powered
            learning together in one place.
          </p>
        </div>

        <div data-hero-fade className="mx-auto mt-8 max-w-[1280px] overflow-hidden rounded-[18px]">
          <SmartImage
            data-parallax
            src="/mockup/about-head.jpg"
            alt="Sedative Physio platform preview"
            loading="eager"
            fetchPriority="high"
            className="h-[clamp(220px,36vw,520px)] w-full object-cover"
          />
        </div>
      </section>

      {/* ── Our Mission ── */}
      <section data-scroll-fade className="px-5 py-14 sm:px-10 sm:py-20 lg:px-[52px]">
        <div className="mx-auto max-w-[1280px]">

          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div data-reveal>
              <h2 className="text-[clamp(1.75rem,6vw,4.1rem)] font-bold leading-none tracking-[-.04em]">
                Our Mission
              </h2>
            </div>
            <div data-reveal>
              <p className="text-base leading-[1.55] text-[#686a6b] sm:text-lg">
                Our mission is to make quality physiotherapy education accessible, engaging, and clinically
                relevant for every learner.
              </p>
            </div>
          </div>

          <div className="my-10 h-px w-full bg-black/10" />

          {/* Stats */}
          <div ref={statsRef} className="grid grid-cols-3 gap-4 sm:gap-8" data-reveal>
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p
                  data-count={value}
                  className="font-display text-[clamp(1.5rem,3.5vw,3rem)] font-bold leading-none tracking-[-0.04em]"
                >
                  {value}
                </p>
                <p className="mt-1.5 text-sm text-[#686a6b] sm:text-base">{label}</p>
              </div>
            ))}
          </div>

          {/* Reversed row */}
          <div className="mt-14 grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div data-reveal className="order-2 lg:order-1">
              <p className="text-base leading-[1.55] text-[#686a6b] sm:text-lg">
                Our mission is to make quality physiotherapy education accessible, engaging, and clinically
                relevant for every learner.
              </p>
            </div>
            <div data-reveal className="order-1 lg:order-2">
              <h2 className="text-[clamp(1.75rem,6vw,4.1rem)] font-bold leading-none tracking-[-.04em] lg:text-right">
                Our Mission
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* ── Meet the Team ── */}
      <section data-scroll-fade className="px-5 py-14 sm:px-10 sm:py-20 lg:px-[52px]">
        <div className="mx-auto max-w-[1280px]">
          <div data-reveal>
            <h2 className="text-[clamp(1.75rem,6vw,4.1rem)] font-bold leading-none tracking-[-.04em]">
              Meet the Team
            </h2>
            <p className="mt-2 text-sm leading-[1.45] text-[#686a6b] sm:text-lg">
              The People Behind Sedative Physio
            </p>
          </div>

          {/* Founder 1 */}
          <div
            data-reveal
            className="about-founder-card mt-10 overflow-hidden rounded-[16px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.07)] sm:rounded-[22px]"
          >
            <div className="grid grid-cols-2 lg:grid-cols-[.58fr_.42fr]">
              <div className="relative bg-[#0b0b0c] p-3 text-[#ececec] sm:p-11">
                <h3 className="text-[clamp(.75rem,3.5vw,2.8rem)] font-black leading-[1.1] tracking-[-.03em]">
                  Dr. Akshay Kumar PT
                </h3>
                <p className="mt-0.5 text-[9px] text-[#bcbcbc] sm:mt-2 sm:text-sm">Physiotherapist &amp; Educator</p>
                <p className="mt-0.5 hidden text-[9px] text-[#888] sm:mt-1 sm:block sm:text-sm">
                  BPT · NDT Certified · ACLS · PALS · BLS
                </p>
                <p className="mt-2 text-[9px] leading-[1.5] text-[#b8b8b8] sm:mt-6 sm:text-base">
                  A qualified BPT physiotherapist and educator with 4+ years of experience in physiotherapy education and clinical practice. He has successfully mentored and tutored 500+ physiotherapy students and professionals.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-1 border-t border-white/10 pt-2 sm:mt-8 sm:gap-4 sm:pt-7">
                  {[
                    { value: "3+", label: "Years Exp." },
                    { value: "3.5yr", label: "Teaching" },
                    { value: "5+", label: "Certs" },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <p className="text-xs font-bold sm:text-xl">{value}</p>
                      <p className="mt-0.5 text-[8px] text-[#888] sm:text-xs">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative min-h-[180px] overflow-hidden bg-[#1a1a1a] sm:min-h-[340px]">
                <SmartImage src="/team/akshay.jpg" alt="Dr. Akshay Kumar" className="h-full w-full object-cover object-top" />
              </div>
            </div>
          </div>

          {/* Founder 2 */}
          <div
            data-reveal
            className="about-founder-card mt-5 overflow-hidden rounded-[16px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.07)] sm:rounded-[22px]"
          >
            <div className="grid grid-cols-2 lg:grid-cols-[.42fr_.58fr]">
              <div className="relative min-h-[180px] overflow-hidden bg-[#1a1a1a] sm:min-h-[340px]">
                <SmartImage src="/team/anushka.jpg" alt="Anushka Kumari" className="h-full w-full object-cover object-top" />
              </div>
              <div className="relative bg-[#0b0b0c] p-3 text-[#ececec] sm:p-11">
                <h3 className="text-[clamp(.75rem,3.5vw,2.8rem)] font-black leading-[1.1] tracking-[-.03em]">
                  Anushka Kumari
                </h3>
                <p className="mt-0.5 text-[9px] text-[#bcbcbc] sm:mt-2 sm:text-sm">Physiotherapist</p>
                <p className="mt-0.5 hidden text-[9px] text-[#888] sm:mt-1 sm:block sm:text-sm">
                  BPT (2020–2024) · Kinesio Taping · Cupping Therapy · IASTM Certified
                </p>
                <p className="mt-2 text-[9px] leading-[1.5] text-[#b8b8b8] sm:mt-6 sm:text-base">
                  A compassionate, evidence-based physiotherapist focused on effective treatment and patient education, with strong communication skills and a patient-first approach.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-1 border-t border-white/10 pt-2 sm:mt-8 sm:gap-4 sm:pt-7">
                  {[
                    { value: "2yr", label: "Exp." },
                    { value: "2024", label: "BPT" },
                    { value: "4+", label: "Certs" },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <p className="text-xs font-bold sm:text-xl">{value}</p>
                      <p className="mt-0.5 text-[8px] text-[#888] sm:text-xs">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Team Member */}
          <div
            data-reveal
            className="about-founder-card mt-5 overflow-hidden rounded-[16px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.07)] sm:rounded-[22px]"
          >
            <div className="grid grid-cols-2 lg:grid-cols-[.58fr_.42fr]">
              <div className="relative bg-[#0b0b0c] p-3 text-[#ececec] sm:p-11">
                <h3 className="text-[clamp(.75rem,3.5vw,2.8rem)] font-black leading-[1.1] tracking-[-.03em]">
                  Dr. Roopali Bhowal PT
                </h3>
                <p className="mt-0.5 text-[9px] text-[#bcbcbc] sm:mt-2 sm:text-sm">Physiotherapist</p>
                <p className="mt-0.5 hidden text-[9px] text-[#888] sm:mt-1 sm:block sm:text-sm">
                  MPT (Neurology) · Asst. Professor, IIHER
                </p>
                <p className="mt-2 text-[9px] leading-[1.5] text-[#b8b8b8] sm:mt-6 sm:text-base">
                  An experienced physiotherapist and academician with 10+ years of clinical and academic experience, specializing in Neurological Physiotherapy.
                </p>
                <div className="mt-3 grid grid-cols-3 gap-1 border-t border-white/10 pt-2 sm:mt-8 sm:gap-4 sm:pt-7">
                  {[
                    { value: "10+", label: "Yrs Exp." },
                    { value: "MPT", label: "Neuro" },
                    { value: "4+", label: "Certs" },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <p className="text-xs font-bold sm:text-xl">{value}</p>
                      <p className="mt-0.5 text-[8px] text-[#888] sm:text-xs">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative min-h-[180px] overflow-hidden bg-[#1a1a1a] sm:min-h-[340px]">
                <SmartImage src="/team/roopali.jpg" alt="Dr. Roopali Bhowal PT" className="h-full w-full object-cover object-top" />
              </div>
            </div>
          </div>
        </div>


      </section>

      {/* ── What We Offer ── */}
      <section data-scroll-fade className="px-5 py-14 sm:px-10 sm:py-20 lg:px-[52px]">
        <div className="mx-auto max-w-[1280px]">
          <div data-reveal>
            <h2 className="text-[clamp(1.75rem,6vw,4.1rem)] font-bold leading-none tracking-[-.04em]">
              What We Offer
            </h2>
            <p className="mt-2 text-sm leading-[1.45] text-[#686a6b] sm:text-lg">
              Everything you need to learn physiotherapy, in one place.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:mt-10 sm:gap-x-8 sm:gap-y-10 xl:grid-cols-3">
            {offerItems.map(({ title, detail, img }) => (
              <article key={title} data-reveal className="group min-w-0">
                <div className="relative aspect-square overflow-hidden rounded-[16px] border border-black/[0.06]">
                  <SmartImage
                    data-parallax
                    src={img}
                    alt={title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <h3 className="mt-2 text-sm font-medium tracking-[-.03em] sm:mt-4 sm:text-xl">{title}</h3>
                <p className="mt-0.5 text-xs text-[#686a6b] sm:mt-1 sm:text-base">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section data-scroll-fade className="px-5 py-16 sm:px-10 sm:py-24 lg:px-[52px]">
        <div className="mx-auto max-w-[1280px] text-center" data-reveal>
          <p className="text-[10px] uppercase leading-[1.2] tracking-[.08em] text-[#686a6b] sm:text-base">Ready to Learn Better?</p>
          <h2 className="mx-auto mt-4 max-w-[580px] text-[clamp(1.8rem,3.8vw,3.4rem)] font-bold leading-[1.06] tracking-[-0.04em]">
            Start building stronger clinical knowledge with Sedative Physio
          </h2>
          <Link
            to="/resources"
            className="group mt-8 inline-flex items-center gap-2.5 rounded-full bg-[#0b0b0c] px-7 py-3.5 text-sm font-medium text-[#ececec] transition-transform hover:-translate-y-0.5"
          >
            Explore Courses
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </div>
  )
}
