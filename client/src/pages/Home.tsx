import { ArrowRight, Quote, Star } from "lucide-react"
import { Link } from "react-router-dom"

const institutions = ["Royal Global University", "NIMS University", "LNCT University", "JSS Academy", "Royal Global University", "NIMS University", "LNCT University"]

function Placeholder({ className = "", label = "IMAGE" }: { className?: string; label?: string }) {
  return <div aria-label={`${label.toLowerCase()} placeholder`} className={`grid place-items-center border border-dashed border-ink/25 bg-white/25 text-[10px] font-medium tracking-[0.15em] text-ink/55 ${className}`}>{label}</div>
}

export function Home() {
  return (
    <div className="overflow-hidden bg-canvas">
      <section className="relative mx-auto grid min-h-[588px] max-w-[1283px] items-center gap-10 px-5 py-14 sm:px-[53px] md:grid-cols-[.95fr_1.05fr] md:py-12">
        <div className="relative z-10 max-w-[595px]">
          <h1 className="max-w-[595px] text-[clamp(2.5rem,4.05vw,3.25rem)] font-bold leading-[1.09] tracking-[-0.035em] text-ink">Everything You Need to Learn Physiotherapy, Better.</h1>
          <p className="mt-6 max-w-[485px] text-[17px] leading-6 text-slate">Access expert-led courses, free study notes, 3D anatomy, videos, podcasts, practice tools and certifications, all in one place.</p>
          <Link to="/about" className="mt-7 inline-flex h-[51px] items-center gap-4 rounded-[5px] bg-ink px-5 text-base font-medium text-canvas transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">Start Learning <ArrowRight size={23} strokeWidth={2.2} /></Link>
        </div>
        <div className="relative mx-auto h-[365px] w-full max-w-[587px] md:h-[470px]">
          <div className="absolute right-[12%] top-[9%] size-52 rounded-full bg-coral/35 blur-3xl" />
          <div className="absolute bottom-[4%] left-[4%] size-44 rounded-full bg-aqua/35 blur-3xl" />
          <Placeholder label="HERO IMAGE" className="absolute inset-[4%] z-10 rounded-[30px] border-white/70 bg-white/15" />
          <div className="absolute left-[10%] top-[16%] h-32 w-3 rotate-[29deg] rounded-full bg-coral/75" /><div className="absolute right-[10%] top-[19%] h-24 w-3 rotate-[61deg] rounded-full bg-coral/65" /><div className="absolute bottom-[15%] right-[16%] h-36 w-3 rotate-[37deg] rounded-full bg-coral/55" />
        </div>
      </section>

      <section className="border-y border-white/70 bg-[#e5e4e1]/70 backdrop-blur-sm"><div className="mx-auto flex min-h-[110px] max-w-[1283px] flex-wrap items-center justify-center gap-5 px-5 py-6 sm:gap-10"><div className="flex -space-x-3" aria-label="Student image placeholders">{[0, 1, 2, 3].map((item) => <Placeholder key={item} label="" className="size-11 rounded-full bg-coral/35" />)}</div><p className="text-center text-sm font-medium text-ink">Trusted by 600+ Physiotherapy students</p><div className="hidden h-[58px] w-px bg-ink/20 sm:block" /><div className="flex items-center gap-2 text-sm text-slate"><Star size={20} fill="#f2c46d" color="#f2c46d" /> 4.8/5 average rating</div></div></section>
      <section className="mx-auto max-w-[1283px] px-5 py-24 sm:px-[53px]"><h2 className="mx-auto max-w-[690px] text-center text-[clamp(2.2rem,4vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.035em] text-ink">Trusted by students from leading institutions</h2></section>
      <div className="bg-ink py-[26px]"><div className="mx-auto flex max-w-[1283px] items-center justify-center gap-4 overflow-hidden px-5">{institutions.map((institution, index) => <span key={`${institution}-${index}`} className="shrink-0 rounded-lg bg-canvas px-4 py-1.5 text-xs text-ink">{institution}</span>)}</div></div>
      <section className="py-28"><h2 className="text-center text-[clamp(2.2rem,4vw,3.25rem)] font-bold tracking-[-0.035em] text-ink">What Our Students Say</h2><div className="relative mx-auto mt-20 max-w-[1440px]"><article className="relative mx-auto w-[min(64%,823px)] min-w-[580px] rounded-bl-[10px] rounded-br-[30px] rounded-tl-[30px] rounded-tr-[10px] border border-black/15 bg-white px-12 pb-8 pt-20 text-center shadow-[0_10px_30px_rgba(41,77,118,0.08)] max-sm:min-w-0 max-sm:w-[calc(100%-2.5rem)] max-sm:px-6"><Placeholder label="PHOTO" className="absolute -top-14 left-8 h-[140px] w-[106px] rounded-[90px] bg-coral/25 max-sm:left-1/2 max-sm:-translate-x-1/2" /><Quote className="mx-auto text-ink" size={42} fill="currentColor" /><p className="mx-auto mt-4 max-w-[583px] text-base leading-[1.55] text-[#8c8c8c]">“I earned 3 certifications in a semester. Helped me stand out during job interviews. 100% recommend for career advancement.”</p><p className="mt-4 text-base font-medium text-ink">~ Shreya Patel</p><p className="text-sm leading-6 text-[#8c8c8c]">JSS Academy of Higher Education<br />Recent Graduate</p></article></div></section>
      <section className="relative isolate overflow-hidden px-5 pb-32 pt-6 sm:px-[53px]"><div className="absolute inset-x-0 bottom-0 -z-10 mx-auto h-[720px] max-w-[1283px] bg-[radial-gradient(circle_at_12%_50%,rgba(243,165,163,.45),transparent_27%),radial-gradient(circle_at_85%_55%,rgba(157,217,232,.5),transparent_31%),radial-gradient(circle_at_49%_83%,rgba(175,162,232,.45),transparent_25%)]" /><h2 className="text-center text-[clamp(2.2rem,4vw,3.25rem)] font-bold tracking-[-0.035em] text-ink">Learn Your Way</h2><div className="mx-auto mt-20 grid max-w-[1025px] grid-cols-4 gap-1 rounded-[30px] border-[3px] border-white bg-white/20 p-1.5 sm:gap-2"><Placeholder className="col-span-4 h-[170px] rounded-[15px] bg-coral/20 sm:h-[250px]" /><Placeholder className="col-span-1 h-[150px] rounded-[15px] bg-aqua/20 sm:h-[170px]" /><Placeholder label="IMAGE" className="col-span-2 h-[150px] rounded-[15px] bg-lavender/35 sm:col-span-1 sm:h-[170px]" /><Placeholder className="col-span-1 h-[150px] rounded-[15px] bg-amber/20 sm:col-span-2 sm:h-[170px]" /><Placeholder className="col-span-2 h-[150px] rounded-[15px] bg-lavender/25 sm:h-[180px]" /><Placeholder className="col-span-2 h-[150px] rounded-[15px] bg-aqua/25 sm:h-[180px]" /></div></section>
    </div>
  )
}
