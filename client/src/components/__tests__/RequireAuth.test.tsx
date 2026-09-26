import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { RequireAuth } from "../RequireAuth"

/**
 * `/account` used to render for anybody who typed the URL, and its API calls then
 * 401'd — a page that looks like it loaded and is quietly empty. These assert the
 * gate itself, since every other account test bypasses it deliberately.
 */

const { useAuth, SignInButton } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  SignInButton: vi.fn(),
}))

vi.mock("@clerk/clerk-react", () => ({
  useAuth,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

beforeEach(() => {
  useAuth.mockReset()
  SignInButton.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("RequireAuth", () => {
  it("renders nothing while the session is still loading", () => {
    useAuth.mockReturnValue({ isLoaded: false, isSignedIn: false })
    const { container } = render(
      <RequireAuth>
        <p>Secret profile</p>
      </RequireAuth>,
    )

    // Showing the signed-out prompt here would flash it at a signed-in user on
    // every navigation.
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText(/sign in to view/i)).not.toBeInTheDocument()
  })

  it("offers sign-in instead of the page when signed out", () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: false })
    render(
      <RequireAuth>
        <p>Secret profile</p>
      </RequireAuth>,
    )

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    expect(screen.queryByText("Secret profile")).not.toBeInTheDocument()
  })

  it("renders the page when signed in", () => {
    useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true })
    render(
      <RequireAuth>
        <p>Secret profile</p>
      </RequireAuth>,
    )

    expect(screen.getByText("Secret profile")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /sign in/i })).not.toBeInTheDocument()
  })
})
