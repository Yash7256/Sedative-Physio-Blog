import { Route, Routes } from "react-router-dom"
import { AuthenticateWithRedirectCallback } from "@clerk/react"
import { Layout } from "@/components/Layout"
import { About } from "@/pages/About"
import { Account } from "@/pages/Account"
import { Cart } from "@/pages/Cart"
import { Contact } from "@/pages/Contact"
import { Home } from "@/pages/Home"
import { Resources } from "@/pages/Resources"

function App() {
  return (
    <Routes>
      <Route
        path="/sso-callback"
        element={<AuthenticateWithRedirectCallback />}
      />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/account" element={<Account />} />
      </Route>
    </Routes>
  )
}

export default App
