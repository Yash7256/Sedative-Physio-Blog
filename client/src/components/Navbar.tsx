import { Button } from "@/components/ui/button"
import { Link, NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
]

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-lg font-bold tracking-tight">
          Sedative Physio
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Button asChild className="ml-2">
            <Link to="/about">Get Started</Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}
