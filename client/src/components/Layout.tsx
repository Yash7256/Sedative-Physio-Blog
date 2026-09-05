import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { initPageAnimations } from "@/lib/animations"

export function Layout() {
  const { pathname } = useLocation()

  useEffect(() => {
    let cleanup: (() => void) | undefined

    // Wait one frame so the new page's DOM is fully painted before querying it
    const id = requestAnimationFrame(() => {
      cleanup = initPageAnimations()
    })

    return () => {
      cancelAnimationFrame(id)
      cleanup?.()
    }
    // Re-run on every route change so ScrollTriggers are fresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1 pt-[92px] sm:pt-[116px] lg:pt-[132px]">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
