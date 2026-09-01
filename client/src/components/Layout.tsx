import { Outlet } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"

export function Layout() {
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
