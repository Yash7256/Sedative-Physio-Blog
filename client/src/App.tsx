import { Route, Routes, useParams } from "react-router-dom"
import { Layout } from "@/components/Layout"
import { About } from "@/pages/About"
import { Account } from "@/pages/Account"
import { Cart } from "@/pages/Cart"
import { Contact } from "@/pages/Contact"
import { CourseDetailPage } from "@/pages/CourseDetailPage"
import { Home } from "@/pages/Home"
import { Resources } from "@/pages/Resources"

function CourseDetailRoute() {
  const { slug } = useParams()
  return <CourseDetailPage slug={slug ?? ""} />
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/resources" element={<Resources />} />
        {/* Canonical URL served by the Express SEO shell; the SPA takes over
            the empty #root and keeps metadata in sync on client navigation. */}
        <Route path="/courses/:slug" element={<CourseDetailRoute />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/cart" element={<Cart />} />
        {/* Reachable signed-out. Account renders its own sign-in prompt, so the
            URL stays a valid destination and only checkout needs a session. */}
        <Route path="/account" element={<Account />} />
      </Route>
    </Routes>
  )
}

export default App
