export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#0b0b0c] text-[#ececec]">
      {/* Watermark — sits in flow at the top, pushes content below */}
      <p
        aria-hidden
        className="pointer-events-none w-full select-none whitespace-nowrap text-center font-bold leading-none tracking-tight text-white/10"
        style={{ fontSize: "clamp(4.5rem, 13vw, 12rem)", paddingTop: "clamp(1.5rem, 3vw, 3rem)" }}
      >
        Sedative Physio
      </p>

      {/* Footer content */}
      <div className="px-5 pb-16 pt-10 sm:px-10 sm:pb-24 sm:pt-12 lg:px-[52px]">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-12 border-b border-white/15 pb-14 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <p className="text-3xl font-bold tracking-[-.05em]">Sedative Physio</p>
              <p className="mt-5 max-w-sm text-[#a8a8a8]">
                India's learning platform for ambitious physiotherapy students.
              </p>
            </div>
            <div>
              <p className="font-medium">Resources</p>
              <div className="mt-5 grid gap-2 text-[#a8a8a8]">
                <span>Courses</span>
                <span>3D anatomy models</span>
                <span>Journal</span>
                <span>Podcast</span>
              </div>
            </div>
            <div>
              <p className="font-medium">Company</p>
              <div className="mt-5 grid gap-2 text-[#a8a8a8]">
                <span>About</span>
                <span>Contact</span>
              </div>
            </div>
            <div>
              <p className="font-medium">Stay connected</p>
              <form
                className="mt-5 flex border-b border-white/40 pb-2"
                onSubmit={(event) => event.preventDefault()}
              >
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#888]"
                  placeholder="Email address"
                  type="email"
                  aria-label="Email address"
                />
                <button className="text-sm">Join</button>
              </form>
            </div>
          </div>
          <p className="pt-6 text-sm text-[#898989]">
            © {new Date().getFullYear()} Sedative Physio. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
