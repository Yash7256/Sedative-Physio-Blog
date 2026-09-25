export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#0b0b0c] text-[#ececec]">
      {/* Watermark — sits in flow at the top, pushes content below */}
      <p
        aria-hidden
        className="pointer-events-none w-full select-none whitespace-nowrap text-center font-bold leading-none tracking-tight text-white/10"
        style={{ fontSize: "clamp(3.25rem, 13vw, 12rem)", paddingTop: "clamp(1rem, 3vw, 3rem)" }}
      >
        Sedative Physio
      </p>

      {/* Footer content */}
      <div className="px-5 pb-12 pt-8 sm:px-10 sm:pb-24 sm:pt-12 lg:px-[52px]">
        <div className="mx-auto max-w-[1440px]">
          {/* Two columns on phones keep the option lists side by side instead of
              stacking. minmax(0,1fr) lets every column shrink evenly, so the
              email form stops starving the link columns into wrapped text. */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-7 border-b border-white/15 pb-8 sm:gap-x-8 sm:gap-y-8 md:grid-cols-[1.6fr_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:pb-14 lg:gap-y-12">
            <div className="col-span-2 md:col-span-1">
              <p className="font-display text-2xl font-bold tracking-[-.05em] lg:text-3xl">
                Sedative Physio
              </p>
              <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-[#a8a8a8] lg:mt-5 lg:text-[15px]">
                India's learning platform for ambitious physiotherapy students.
              </p>
            </div>
            <div>
              <p className="text-[12px] font-medium lg:text-[13px]">Resources</p>
              <div className="mt-3.5 grid gap-1.5 text-[13px] text-[#a8a8a8] lg:mt-5 lg:gap-2 lg:text-sm">
                <span>Courses</span>
                <span>3D anatomy models</span>
                <span>Journal</span>
                <span>Podcast</span>
              </div>
            </div>
            <div>
              <p className="text-[12px] font-medium lg:text-[13px]">Company</p>
              <div className="mt-3.5 grid gap-1.5 text-[13px] text-[#a8a8a8] lg:mt-5 lg:gap-2 lg:text-sm">
                <span>About</span>
                <span>Contact</span>
              </div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-[12px] font-medium lg:text-[13px]">Stay connected</p>
              <form
                className="mt-3.5 flex border-b border-white/40 pb-2 lg:mt-5"
                onSubmit={(event) => event.preventDefault()}
              >
                <input
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#888] lg:text-sm"
                  placeholder="Email address"
                  type="email"
                  aria-label="Email address"
                />
                <button className="text-[13px] lg:text-sm">Join</button>
              </form>
            </div>
          </div>
          <p className="pt-5 text-xs text-[#898989] lg:pt-6 lg:text-sm">
            © {new Date().getFullYear()} Sedative Physio. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
