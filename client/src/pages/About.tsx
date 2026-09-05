import { useEffect, useRef } from "react"
import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import gsap from "gsap"

// ── Figma assets ─────────────────────────────────────────────────────────────
const imgHeroMockup =
  "https://www.figma.com/api/mcp/asset/426166d7-8d55-4186-9319-56b89d6f92d8.png"
const imgFounder1 =
  "https://www.figma.com/api/mcp/asset/36175c5d-cf54-4ac2-a51a-6c024f49c80b.png"
const imgFounder2 =
  "https://www.figma.com/api/mcp/asset/00633f36-e45d-4d1f-a6fa-dc0810ad728a.png"

const imgOffer1 = "https://www.figma.com/api/mcp/asset/eb080f05-efae-47b0-adc0-286813b5cf5a.png"
const imgOffer2 = "https://www.figma.com/api/mcp/asset/2454a5c0-cee6-478f-a68a-7bbb396d61a9.png"
const imgOffer3 = "https://www.figma.com/api/mcp/asset/0c823db6-7056-40b8-a95d-1c26ae898386.png"
const imgOffer4 = "https://www.figma.com/api/mcp/asset/39b524e7-13e7-4638-9504-98d75f0c0609.png"
const imgOffer5 = "https://www.figma.com/api/mcp/asset/a05bf17d-17bc-4179-8d4f-e2e812051687.png"
const imgOffer6 = "https://www.figma.com/api/mcp/asset/1c4403c0-5715-4d28-a27a-1e295227c5e5.png"

const imgPartner1 = "https://www.figma.com/api/mcp/asset/0bbb420f-7337-4ce5-8e8c-e413fccd04f4.svg"
const imgPartner2 = "https://www.figma.com/api/mcp/asset/b7dcd65b-a440-42f4-8125-e1e34a27ef1e.svg"
const imgPartner3 = "https://www.figma.com/api/mcp/asset/83649c82-ab7a-45ac-81b7-f227677ddc54.svg"
const imgPartner4 = "https://www.figma.com/api/mcp/asset/5a2caf4e-1fb5-4321-b8c8-e592c822f11a.svg"
const imgPartner5 = "https://www.figma.com/api/mcp/asset/fc417056-1bd8-456b-9532-f0c1adc53055.svg"
const imgPartner6 = "https://www.figma.com/api/mcp/asset/78f52518-8b49-4969-9c8f-49089bfe2ce1.svg"
const imgPartner7 = "https://www.figma.com/api/mcp/asset/98e69034-ce26-4eab-8a8e-440abb5fc769.svg"
const imgPartner8 = "https://www.figma.com/api/mcp/asset/46ec3493-bc40-4f28-8d32-2e6e4019ef2b.svg"

const stats = [
  { value: "600+", label: "Students Enrolled" },
  { value: "1500+", label: "Hours Of Content" },
  { value: "4.9", label: "Average Course Rating" },
]

const offerItems = [
  { title: "Courses", detail: "100+ courses", badge: "NEW", img: imgOffer1 },
  { title: "3D Anatomy Models", detail: "100+ Models", badge: "BESTSELLER", img: imgOffer2 },
  { title: "Notes", detail: "Handwritten Notes", badge: "BESTSELLER", img: imgOffer3 },
  { title: "AI Assistant", detail: "Clear Your Doubts 24/7", badge: "NEW", img: imgOffer4 },
  { title: "Journal", detail: "100+ Journals", badge: "BESTSELLER", img: imgOffer5 },
  { title: "Podcast", detail: "World Class Physiotherapists", badge: "POPULAR", img: imgOffer6 },
]

const partners = [
  imgPartner1, imgPartner2, imgPartner3, imgPartner4,
  imgPartner5, imgPartner6, imgPartner7, imgPartner8,
]

export function About() {
  const heroRef = useRef<HTMLDivElement>(null)

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
            className="text-[clamp(2.4rem,5.5vw,5rem)] font-bold leading-[0.95] tracking-[-0.04em]"
          >
            About Us
          </h1>
          <p
            data-hero-fade
            className="mt-4 max-w-[560px] text-base leading-[1.5] text-[#686a6b] sm:text-lg"
          >
            We bring courses, clinical resources, 3D anatomy models, journals, podcasts, and AI-powered
            learning together in one place.
          </p>
        </div>

        <div data-hero-fade className="mx-auto mt-8 max-w-[1280px] overflow-hidden rounded-[18px]">
          <img
            data-parallax
            src={imgHeroMockup}
            alt="Sedative Physio platform preview"
            className="h-[clamp(220px,36vw,520px)] w-full object-cover"
          />
        </div>
      </section>

      {/* ── Our Mission ── */}
      <section data-scroll-fade className="px-5 py-14 sm:px-10 sm:py-20 lg:px-[52px]">
        <div className="mx-auto max-w-[1280px]">

          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div data-reveal>
              <h2 className="text-[clamp(2rem,4.5vw,4rem)] font-bold leading-[0.97] tracking-[-0.04em]">
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
          <div className="grid gap-8 sm:grid-cols-3" data-reveal>
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-[clamp(2.2rem,5vw,4.2rem)] font-bold leading-none tracking-[-0.04em]">
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
              <h2 className="text-[clamp(2rem,4.5vw,4rem)] font-bold leading-[0.97] tracking-[-0.04em] lg:text-right">
                Our Mission
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* ── Meet the Founders ── */}
      <section data-scroll-fade className="px-5 py-14 sm:px-10 sm:py-20 lg:px-[52px]">
        <div className="mx-auto max-w-[1280px]">
          <div data-reveal>
            <h2 className="text-[clamp(2rem,4.5vw,4rem)] font-bold leading-[0.97] tracking-[-0.04em]">
              Meet the Founders
            </h2>
            <p className="mt-2 text-base text-[#686a6b] sm:text-lg">
              The People Behind Sedative Physio
            </p>
          </div>

          {/* Founder 1 */}
          <div
            data-reveal
            className="about-founder-card mt-10 overflow-hidden rounded-[18px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.07)]"
          >
            <div className="grid lg:grid-cols-[.58fr_.42fr]">
              <div className="relative bg-[#0b0b0c] p-8 text-[#ececec] sm:p-11">
                <h3 className="text-[clamp(1.5rem,2.2vw,2.5rem)] font-black leading-[1.05] tracking-[-0.03em]">
                  Dr. Akshay Kumar PT
                </h3>
                <p className="mt-1.5 text-[#bcbcbc]">Physiotherapist &amp; Educator</p>
                <p className="mt-1 text-sm text-[#888]">
                  BPT · IIHERCOMT Certified · NDT Certified · ACLS · PALS · BLS · WHO Certified
                </p>
                <p className="mt-6 max-w-[480px] text-sm leading-[1.7] text-[#b8b8b8] sm:text-base">
                  With over 3 years of clinical experience spanning musculoskeletal, neurological, and sports
                  physiotherapy, Dr. Akshay Kumar founded Sedative Physio to bridge the gap between clinical
                  practice and accessible education. Based in Patna, Bihar, he currently runs Moksh
                  Physiotherapy clinic alongside building courses that have helped hundreds of BPT and MPT
                  students.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-7">
                  {[
                    { value: "3+ Years", label: "Clinical Experience" },
                    { value: "3 yrs 7 mo", label: "Teaching" },
                    { value: "5+", label: "Certifications" },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <p className="text-lg font-bold sm:text-xl">{value}</p>
                      <p className="mt-0.5 text-xs text-[#888]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative min-h-[280px] overflow-hidden bg-[#1a1a1a] lg:min-h-0">
                <img src={imgFounder1} alt="Dr. Akshay Kumar" className="h-full w-full object-cover object-top" />
              </div>
            </div>
          </div>

          {/* Founder 2 */}
          <div
            data-reveal
            className="about-founder-card mt-5 overflow-hidden rounded-[18px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.07)]"
          >
            <div className="grid lg:grid-cols-[.42fr_.58fr]">
              <div className="relative min-h-[280px] overflow-hidden bg-[#1a1a1a] lg:min-h-0">
                <img src={imgFounder2} alt="Anushka Kumari" className="h-full w-full object-cover object-top" />
              </div>
              <div className="relative bg-[#0b0b0c] p-8 text-[#ececec] sm:p-11">
                <h3 className="text-[clamp(1.5rem,2.2vw,2.5rem)] font-black leading-[1.05] tracking-[-0.03em]">
                  Anushka Kumari
                </h3>
                <p className="mt-1.5 text-[#bcbcbc]">Physiotherapist</p>
                <p className="mt-1 text-sm text-[#888]">
                  BPT (2020–2024) · Kinesio Taping · Cupping Therapy · Manual Therapy · IASTM Certified
                </p>
                <p className="mt-6 max-w-[480px] text-sm leading-[1.7] text-[#b8b8b8] sm:text-base">
                  A compassionate, evidence-based physiotherapist focused on effective treatment and patient
                  education, with strong communication skills and a patient-first approach.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-7">
                  {[
                    { value: "2 Years", label: "Clinical Experience" },
                    { value: "2020–2024", label: "BPT Education" },
                    { value: "4", label: "Certifications" },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <p className="text-lg font-bold sm:text-xl">{value}</p>
                      <p className="mt-0.5 text-xs text-[#888]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What We Offer ── */}
      <section data-scroll-fade className="px-5 py-14 sm:px-10 sm:py-20 lg:px-[52px]">
        <div className="mx-auto max-w-[1280px]">
          <div data-reveal>
            <h2 className="text-[clamp(2rem,4.5vw,4rem)] font-bold leading-[0.97] tracking-[-0.04em]">
              What We Offer
            </h2>
            <p className="mt-2 text-base text-[#686a6b] sm:text-lg">
              Everything you need to learn physiotherapy, in one place.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {offerItems.map(({ title, detail, badge, img }) => (
              <article key={title} data-reveal className="group min-w-0">
                <div className="relative aspect-square overflow-hidden rounded-[16px] border border-black/[0.06]">
                  <img
                    data-parallax
                    src={img}
                    alt={title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                  <span className="absolute right-2.5 top-2.5 rounded-full border border-black/[0.08] bg-[#ececec] px-2.5 py-0.5 text-[9px] font-semibold tracking-wide text-[#0b0b0c]">
                    {badge}
                  </span>
                </div>
                <h3 className="mt-2.5 text-base font-semibold tracking-[-0.025em]">{title}</h3>
                <p className="mt-0.5 text-sm text-[#686a6b]">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trusted Partners ── */}
      <section data-scroll-fade className="border-t border-black/10 px-5 py-14 sm:px-10 sm:py-20 lg:px-[52px]">
        <div className="mx-auto max-w-[1280px]">
          <div data-reveal>
            <h2 className="text-[clamp(2rem,4.5vw,4rem)] font-bold leading-[0.97] tracking-[-0.04em]">
              Trusted Partners
            </h2>
            <p className="mt-2 max-w-[620px] text-base text-[#686a6b] sm:text-lg">
              Students from universities and institutions across India use Sedative Physio to strengthen their
              physiotherapy knowledge.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" data-reveal>
            {partners.map((src, i) => (
              <div
                key={i}
                className="flex items-center justify-center rounded-[10px] bg-[#d8d8d7] px-6 py-8"
              >
                <img src={src} alt={`Partner ${i + 1}`} className="h-7 w-auto object-contain opacity-70" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section data-scroll-fade className="px-5 py-16 sm:px-10 sm:py-24 lg:px-[52px]">
        <div className="mx-auto max-w-[1280px] text-center" data-reveal>
          <p className="text-xs uppercase tracking-[0.12em] text-[#686a6b]">Ready to Learn Better?</p>
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
