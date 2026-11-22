import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { Navbar } from "../Navbar"
import { CartProvider } from "@/lib/cartContext"

/**
 * Which navbar actions are shown is a function of the session. The cart is
 * deliberately not one of them: browsing a cart is part of evaluating a
 * purchase, so it is visible signed-out and the checkout button asks for the
 * session. Notifications remain session-only because they belong to a profile.
 */
const clerk = vi.hoisted(() => ({ isSignedIn: false, signOut: vi.fn(() => Promise.resolve()) }))

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: clerk.isSignedIn,
    userId: clerk.isSignedIn ? "user_test" : undefined,
  }),
  // The user object is what supplies the avatar, so it has to be present in the
  // same shape as the real one — a partial mock here renders a fallback avatar
  // and the link assertion would pass for the wrong reason.
  useUser: () => ({
    isLoaded: true,
    isSignedIn: clerk.isSignedIn,
    user: clerk.isSignedIn
      ? {
          fullName: "Test User",
          imageUrl: "https://img.test/avatar.png",
          primaryEmailAddress: { emailAddress: "test@example.com" },
        }
      : null,
  }),
  useClerk: () => ({ signOut: clerk.signOut }),
  // Mirrors the real components: a conditional render with no DOM wrapper of
  // its own, so the navbar's flex gaps are unaffected.
  SignedIn: ({ children }: { children: React.ReactNode }) => (clerk.isSignedIn ? <>{children}</> : null),
  SignedOut: ({ children }: { children: React.ReactNode }) => (clerk.isSignedIn ? null : <>{children}</>),
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
  clerk.signOut.mockClear()
})

describe("navbar session-aware actions", () => {
  it("offers the cart while signed out, but no account-only actions", () => {
    clerk.isSignedIn = false
    renderNavbar()

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    expect(themeToggle()).toBeInTheDocument()
    expect(cartButton()).toBeInTheDocument()

    expect(notificationButton()).not.toBeInTheDocument()
  })

  it("offers no sign-up control", () => {
    clerk.isSignedIn = false
    renderNavbar()

    expect(screen.queryByRole("button", { name: /sign ?up/i })).not.toBeInTheDocument()
  })

  it("adds the notification icon once signed in", () => {
    clerk.isSignedIn = true
    renderNavbar()

    expect(cartButton()).toBeInTheDocument()
    expect(notificationButton()).toBeInTheDocument()
    expect(themeToggle()).toBeInTheDocument()

    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument()
  })

  it("links the signed-in avatar to the account page", () => {
    clerk.isSignedIn = true
    renderNavbar()

    // The avatar is the signed-in shortcut to the account page; if it silently
    // stops pointing at /account the shortcut breaks even though the URL is
    // reachable directly.
    expect(screen.getByRole("link", { name: /view your profile/i })).toHaveAttribute("href", "/account")
  })

  it("signs out on request", async () => {
    clerk.isSignedIn = true
    renderNavbar()

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }))
    expect(clerk.signOut).toHaveBeenCalled()
  })
})
