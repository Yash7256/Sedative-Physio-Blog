export function Footer() {
  return (
    <footer className="bg-ink px-5 py-16 text-white sm:px-[53px]">
      <div className="mx-auto max-w-[1152px]">
        <div className="grid gap-12 border-b border-white/20 pb-12 md:grid-cols-[1.55fr_1fr_1fr_1fr]"><div><p className="text-3xl font-medium">Sedative Physio</p><p className="mt-5 max-w-[300px] text-sm leading-6 text-white/60">India's #1 learning platform for Physiotherapy students. Expert-led clinical courses built for your career.</p></div><div><p className="text-sm font-medium uppercase tracking-wide">Resources</p><div className="mt-5 grid gap-2 text-sm text-white/60"><span>Podcast</span><span>Journal</span><span>3D anatomy models</span><span>AI assistant</span><span>Courses</span></div></div><div><p className="text-sm font-medium uppercase tracking-wide">Company</p><p className="mt-5 text-sm text-white/60">About</p></div><div><p className="text-sm font-medium uppercase tracking-wide">Support</p><div className="mt-5 grid gap-2 text-sm text-white/60"><span>FAQs</span><span>Contact</span></div></div></div>
        <div className="pt-10"><p className="text-sm text-white/70">Get weekly clinical tips</p><form className="mt-4 flex overflow-hidden rounded-[10px] border border-white/20 bg-white/10" onSubmit={(event) => event.preventDefault()}><input aria-label="Email address" className="min-w-0 flex-1 bg-transparent px-5 py-4 text-sm text-white placeholder:text-white/45 focus:outline-none" placeholder="Email Address" type="email" /><button className="bg-canvas px-7 text-sm font-medium text-ink transition-colors hover:bg-white">Join Now</button></form></div><p className="mt-12 border-t border-white/20 pt-6 text-center text-sm text-white/60">© {new Date().getFullYear()} - Sedative Physio<br />All Rights Reserved</p>
      </div>
    </footer>
  )
}
