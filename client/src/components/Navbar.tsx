import { useState } from "react"
import { ArrowRight, Menu } from "lucide-react"
import { Link } from "react-router-dom"
import { useUser, useClerk } from "@clerk/react"
import { UserMenu } from "./UserMenu"
import { AuthModal } from "./AuthModal"

const navItems = [
  { label: "Contact", to: "/about" },
  { label: "About", to: "/about" },
  { label: "Resources", to: "/about" },
]

export function Navbar() {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const { isSignedIn, user } = useUser()
  const { signOut } = useClerk()

  const displayName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Account"

  return (
    <header className="border-b border-black/10 bg-canvas">
      <nav className="mx-auto grid min-h-[68px] max-w-[1283px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-5 py-3 sm:px-[53px]">
        <Link to="/" aria-label="Sedative Physio home" className="col-start-1 row-start-1 flex min-w-0 items-center justify-self-start">
          <img src="/logo.png" alt="Sedative Physio" className="h-9 w-auto" />
        </Link>
        <div className="col-start-2 hidden items-center gap-8 justify-self-center md:flex">
          {navItems.map((item) => <Link key={item.label} to={item.to} className="text-base text-ink transition-opacity hover:opacity-60">{item.label}</Link>)}
        </div>
        <div className="col-start-3 row-start-1 flex items-center justify-self-end gap-3">
          {isSignedIn ? (
            <UserMenu displayName={displayName} onSignOut={() => signOut()} />
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex h-[35px] items-center gap-2 rounded-[5px] bg-ink px-4 text-sm text-canvas transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Log In <ArrowRight size={16} strokeWidth={2.25} />
            </button>
          )}
          <button aria-label="Open navigation" className="grid size-9 place-items-center text-ink md:hidden"><Menu size={22} /></button>
        </div>
      </nav>
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </header>
  )
}
