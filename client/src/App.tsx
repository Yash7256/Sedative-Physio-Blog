import { Route, Routes } from "react-router-dom"
import { Layout } from "@/components/Layout"
import { RequireAuth } from "@/components/RequireAuth"
import { About } from "@/pages/About"
import { Account } from "@/pages/Account"
import { Cart } from "@/pages/Cart"
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
        <Route path="/cart" element={<Cart />} />
        {/* Gated in the app rather than relying on the server to 401 every
            request behind it: the page would otherwise render its own shell and
            then fail, which reads as a broken page instead of "sign in". */}
        <Route
          path="/account"
          element={
            <RequireAuth>
              <Account />
            </RequireAuth>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
