import { useEffect, useState } from "react"
import { Menu, Moon, Search, ShoppingCart, Sun, UserRound, X } from "lucide-react"
import { Link } from "react-router-dom"
import { useUser, useClerk } from "@clerk/react"
import { UserMenu } from "./UserMenu"
import { AuthModal } from "./AuthModal"

const navItems = ["Resources", "About", "Contact"]
const themeKey = "sedative-physio-theme"

export function Navbar() {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const { isSignedIn, user } = useUser()
  const { signOut } = useClerk()
  const displayName = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Account"

  useEffect(() => {
    const savedTheme = localStorage.getItem(themeKey)
    const shouldUseDark = savedTheme ? savedTheme === "dark" : true
    document.documentElement.classList.toggle("dark", shouldUseDark)
    setIsDark(shouldUseDark)
  }, [])

  useEffect(() => {
    let lastScrollY = window.scrollY
    let animationFrame: number | null = null

    function updateVisibility() {
      const currentScrollY = window.scrollY
      const scrollDelta = currentScrollY - lastScrollY

      if (currentScrollY < 32) setIsVisible(true)
      else if (Math.abs(scrollDelta) > 8) setIsVisible(scrollDelta < 0)

      lastScrollY = currentScrollY
      animationFrame = null
    }

    function handleScroll() {
      if (animationFrame === null) animationFrame = window.requestAnimationFrame(updateVisibility)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  function toggleTheme() {
    const nextTheme = !isDark
    document.documentElement.classList.toggle("dark", nextTheme)
    localStorage.setItem(themeKey, nextTheme ? "dark" : "light")
    setIsDark(nextTheme)
  }

  return <header className={`site-header fixed inset-x-0 top-0 z-30 px-4 pt-4 sm:px-8 sm:pt-6 lg:px-[51px] lg:pt-10 ${isVisible || menuOpen ? "site-header--visible" : "site-header--hidden"}`}><nav className="site-nav mx-auto grid min-h-[68px] max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center rounded-full border px-6 sm:min-h-[80px] sm:px-10"><div className="hidden items-center gap-7 md:flex">{navItems.map((item) => <Link key={item} to="/about" className="site-nav-link text-sm transition-opacity hover:opacity-55">{item}</Link>)}</div><Link to="/" className="site-nav-link justify-self-center text-center text-lg font-bold tracking-[-.04em]">Sedative Physio</Link><div className="flex items-center justify-self-end gap-4 sm:gap-6"><button type="button" onClick={toggleTheme} aria-label={`Switch to ${isDark ? "light" : "dark"} mode`} title={`Switch to ${isDark ? "light" : "dark"} mode`} className="theme-toggle grid size-9 place-items-center rounded-full transition-colors">{isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}</button><button aria-label="Search" className="site-nav-link hidden sm:block"><Search className="size-[18px]" /></button><button aria-label="Cart" className="site-nav-link hidden sm:block"><ShoppingCart className="size-[18px]" /></button>{isSignedIn ? <UserMenu displayName={displayName} onSignOut={() => signOut()} /> : <button aria-label="Log in" className="site-nav-link" onClick={() => setAuthModalOpen(true)}><UserRound className="size-[18px]" /></button>}<button className="site-nav-link md:hidden" aria-label={menuOpen ? "Close navigation" : "Open navigation"} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X /> : <Menu />}</button></div></nav>{menuOpen && <div className="site-menu absolute inset-x-4 top-full rounded-b-[24px] border px-6 py-4 shadow-lg sm:inset-x-8 lg:hidden">{navItems.map((item) => <Link key={item} to="/about" onClick={() => setMenuOpen(false)} className="block border-b py-3 last:border-0">{item}</Link>)}</div>}<AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} /></header>
}
