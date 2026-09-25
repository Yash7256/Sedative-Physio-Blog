import { useEffect, useState } from "react"
import { Bell, Moon, Search, ShoppingCart, Sun } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useCart } from "../lib/cartContext"

const navItems = [
  { label: "Resources", to: "/resources" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
]
const themeKey = "sedative-physio-theme"

export function Navbar() {
  const [isDark, setIsDark] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const navigate = useNavigate()
  const { items } = useCart()
  const cartCount = items.length

  useEffect(() => {
    const savedTheme = localStorage.getItem(themeKey)
    const shouldUseDark = savedTheme ? savedTheme === "dark" : false
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
    const next = !isDark
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem(themeKey, next ? "dark" : "light")
    setIsDark(next)
  }

  return (
    <header
      className={`site-header fixed inset-x-0 top-0 z-30 px-2 pt-2 sm:px-8 sm:pt-6 lg:px-[51px] lg:pt-10 ${
        isVisible ? "site-header--visible" : "site-header--hidden"
      }`}
    >
      <nav className="site-nav mx-auto grid min-h-[52px] max-w-[1280px] grid-cols-[1fr_auto_1fr] items-center rounded-full border px-5 sm:min-h-[80px] sm:px-12">
        {/* Left – nav links */}
        <div className="col-start-1 hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="site-nav-link text-sm transition-opacity hover:opacity-55"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Centre – wordmark */}
        <Link
          to="/"
          className="site-nav-link font-display col-start-1 justify-self-start text-left text-[13px] font-bold tracking-[-.04em] sm:text-lg md:col-start-2 md:justify-self-center md:text-center"
        >
          Sedative Physio
        </Link>

        {/* Right – actions */}
        <div className="col-start-3 flex items-center justify-self-end gap-4 sm:gap-6">
          <button aria-label="Search" className="site-nav-link hidden sm:block">
            <Search className="size-[18px]" />
          </button>

          <button
            aria-label={`Cart${cartCount > 0 ? `, ${cartCount} item${cartCount > 1 ? "s" : ""}` : ""}`}
            onClick={() => navigate("/cart")}
            className="site-nav-link relative"
          >
            <ShoppingCart className="size-[18px]" />
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-[#1683f6] text-[9px] font-bold text-white">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>

          <button type="button" aria-label="Notifications" title="Notifications" className="site-nav-link">
            <Bell className="size-[18px]" />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            title={`Switch to ${isDark ? "light" : "dark"} mode`}
            className="theme-toggle hidden size-9 place-items-center rounded-full transition-colors md:grid"
          >
            {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
        </div>
      </nav>
    </header>
  )
}
