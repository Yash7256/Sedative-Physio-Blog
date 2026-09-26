import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Navbar } from "../Navbar"
import { CartProvider } from "@/lib/cartContext"

/**
 * Which navbar actions are shown is a function of the session, and getting it
 * wrong is invisible in a screenshot of the signed-out state alone — a cart
 * icon that leaks through only shows up once someone is looking for it while
 * signed out. So both directions are asserted.
 */
const clerk = vi.hoisted(() => ({ isSignedIn: false }))

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: clerk.isSignedIn,
    userId: clerk.isSignedIn ? "user_test" : undefined,
  }),
  // Mirrors the real components: a conditional render with no DOM wrapper of
  // its own, so the navbar's flex gaps are unaffected.
  SignedIn: ({ children }: { children: React.ReactNode }) => (clerk.isSignedIn ? <>{children}</> : null),
  SignedOut: ({ children }: { children: React.ReactNode }) => (clerk.isSignedIn ? null : <>{children}</>),
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <button type="button">Account menu</button>,
}))

// The profile round trip has its own coverage in `auth.test.tsx`; stubbing it
// keeps this focused on which controls the navbar chooses to render.
vi.mock("@/lib/auth", () => ({
  useAuthProfile: () => ({
    profile: { fullName: "Test User", email: "test@example.com" },
    isProfilePending: false,
    error: null,
  }),
}))

function renderNavbar() {
  return render(
    <MemoryRouter>
      <CartProvider>
        <Navbar />
      </CartProvider>
    </MemoryRouter>,
  )
}

const cartButton = () => screen.queryByRole("button", { name: /^Cart/ })
const notificationButton = () => screen.queryByRole("button", { name: "Notifications" })
const themeToggle = () => screen.queryByRole("button", { name: /switch to (dark|light) mode/i })

afterEach(() => {
  clerk.isSignedIn = false
})

describe("navbar session-aware actions", () => {
  it("offers sign-in and the theme toggle, but no account actions, while signed out", () => {
    clerk.isSignedIn = false
    renderNavbar()

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    expect(themeToggle()).toBeInTheDocument()

    expect(cartButton()).not.toBeInTheDocument()
    expect(notificationButton()).not.toBeInTheDocument()
  })

  it("swaps in the cart and notification icons once signed in", () => {
    clerk.isSignedIn = true
    renderNavbar()

    expect(cartButton()).toBeInTheDocument()
    expect(notificationButton()).toBeInTheDocument()
    expect(themeToggle()).toBeInTheDocument()

    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument()
  })
})
