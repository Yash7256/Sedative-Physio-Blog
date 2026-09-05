import { Route, Routes } from "react-router-dom"
import { Layout } from "@/components/Layout"
import { About } from "@/pages/About"
import { Contact } from "@/pages/Contact"
import { Home } from "@/pages/Home"
import { Resources } from "@/pages/Resources"

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
    </Routes>
  )
}

export default App
