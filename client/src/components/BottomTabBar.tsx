import { Link, useLocation } from "react-router-dom"
import { Home, Contact, Clock, CircleUser, User } from "lucide-react"
import { scrollToTop } from "@/lib/animations"

const tabs = [
  { label: "Home", icon: Home, to: "/" },
  { label: "Resources", icon: Clock, to: "/resources" },
  { label: "Contact", icon: Contact, to: "/contact" },
  { label: "Profile", icon: CircleUser, to: "/cart" },
  { label: "About", icon: User, to: "/about" },
] as const

export function BottomTabBar() {
  const { pathname } = useLocation()

  function isActive(to: string) {
    if (to === "/") return pathname === "/"
    return pathname.startsWith(to)
  }

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 inset-x-0 z-40 flex h-[72px] items-center justify-around border-t border-black/10 bg-[#f3f3f3]/95 backdrop-blur-md px-2 md:hidden dark:border-white/10 dark:bg-[#151515]/95"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map(({ label, icon: Icon, to }) => {
        const active = isActive(to)
        return (
          <Link
            key={label}
            to={to}
            // Tapping the tab you're already on is a "take me home" gesture.
            // Routing won't fire (same path), so scroll back up by hand.
            // Real navigation is handled by Layout's route-change reset.
            onClick={() => {
              if (active) scrollToTop(true)
            }}
            className={`flex flex-1 flex-col items-center justify-center gap-1.5 py-2 text-[11px] transition-colors ${
              active
                ? "text-[#0b0b0c] dark:text-[#f5f4ef]"
                : "text-[#686a6b] dark:text-[#b4b4af]"
            }`}
          >
            <Icon
              className={`size-[22px] transition-transform ${active ? "scale-110" : ""}`}
              strokeWidth={active ? 2.2 : 1.8}
            />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
