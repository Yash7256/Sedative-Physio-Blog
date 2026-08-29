import { ArrowRight, Menu } from "lucide-react"
import { Link } from "react-router-dom"

const navItems = [
  { label: "Contact", to: "/about" },
  { label: "About", to: "/about" },
  { label: "Resources", to: "/about" },
]

export function Navbar() {
  return (
    <header className="border-b border-black/10 bg-canvas">
      <nav className="mx-auto flex h-[67px] max-w-[1283px] items-center justify-between px-5 sm:px-[53px]">
        <Link to="/" aria-label="Sedative Physio home" className="flex h-8 w-12 items-center justify-center rounded border border-dashed border-ink/30 text-[9px] font-bold tracking-[0.12em] text-ink">LOGO</Link>
        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => <Link key={item.label} to={item.to} className="text-sm text-ink transition-opacity hover:opacity-60">{item.label}</Link>)}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/about" className="inline-flex h-[35px] items-center gap-2 rounded-[5px] bg-ink px-3 text-sm text-canvas transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">Log In <ArrowRight size={16} strokeWidth={2.25} /></Link>
          <button aria-label="Open navigation" className="grid size-9 place-items-center text-ink md:hidden"><Menu size={22} /></button>
        </div>
      </nav>
    </header>
  )
}
