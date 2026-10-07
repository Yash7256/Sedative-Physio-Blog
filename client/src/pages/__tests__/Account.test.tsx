import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"

import { Account } from "../Account"
import { AuthProvider, type AuthProfile } from "@/lib/auth"

/**
 * What this file is really protecting is the promise that the account page never
 * shows something the database did not say. The old page invented a member since
 * date, a role and a row of recent activity, and every one of those values was
 * plausible enough to pass a glance — which is why the assertions here are about
 * absent and present data, not about layout.
 */

const { useAuth, useUser, useClerk, signOut, openUserProfile } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useUser: vi.fn(),
  useClerk: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
  openUserProfile: vi.fn(),
}))

vi.mock("@clerk/clerk-react", () => ({ useAuth, useUser, useClerk }))

const fetchMock = vi.fn()

const PROFILE: AuthProfile = {
  clerkUserId: "user_2abc",
  userId: "clyabc123",
  role: "user",
  email: "ada@example.com",
  fullName: "Ada Lovelace",
  collegeName: "King's College",
  emailVerified: true,
}

const COURSE = {
  id: "c1",
  title: "Anatomy of Movement",
  slug: "anatomy-of-movement",
  shortDescription: null,
  thumbnail: null,
  level: "Beginner",
  language: "English",
  estimatedHours: 5,
  price: 49900,
  isFree: false,
}

const ORDER = {
  id: "o1",
  amount: 49900,
  currency: "INR",
  status: "PAID" as const,
  courseIds: ["c1"],
  createdAt: "2026-08-02T00:00:00.000Z",
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

/** Answers the profile plus whichever account endpoints the test cares about. */
function route(profile: AuthProfile, extra: Record<string, unknown> = {}) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (url.includes("/api/auth/me") && init?.method === "PATCH") {
      return Promise.resolve(jsonResponse(profile))
    }
    if (url.includes("/api/auth/me")) return Promise.resolve(jsonResponse(profile))

    const match = Object.keys(extra).find((path) => url.includes(path))
    if (match) return Promise.resolve(jsonResponse(extra[match]))

    return Promise.reject(new Error(`unexpected request to ${url}`))
  })
}

function renderAccount() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Account />
      </AuthProvider>
    </MemoryRouter>,
  )
}

const sidebar = () => screen.getByRole("navigation", { name: /account navigation/i })

async function openSection(name: RegExp) {
  await userEvent.click(within(sidebar()).getByRole("button", { name }))
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  useAuth.mockReturnValue({ isLoaded: true, isSignedIn: true, userId: "user_2abc" })
  useUser.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    user: {
      fullName: "Ada Lovelace",
      imageUrl: "https://img.test/ada.png",
      createdAt: new Date("2025-01-15T00:00:00.000Z"),
    },
  })
  useClerk.mockReturnValue({ signOut, openUserProfile })
  signOut.mockClear()
  openUserProfile.mockClear()
  route(PROFILE, { "/my-orders": [], "/my-enrollments": [], "/api/courses": [COURSE] })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("profile", () => {
  it("shows the name, email and college from the app's own profile", async () => {
    renderAccount()

    await waitFor(() => expect(screen.getByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument())
    expect(screen.getAllByText("ada@example.com").length).toBeGreaterThan(0)
    expect(screen.getByText("King's College")).toBeInTheDocument()
  })

  it("takes the member-since date from Clerk, not from the local row", async () => {
    renderAccount()

    // The profile row is created whenever the webhook lands, so its date says
    // nothing about when the person joined. Clerk's does.
    await waitFor(() => expect(screen.getByText(/Member since 15 Jan 2025/)).toBeInTheDocument())
  })

  it("derives the role from the profile instead of assuming Student", async () => {
    route({ ...PROFILE, role: "admin" })
    renderAccount()

    await waitFor(() => expect(screen.getAllByText("Admin").length).toBeGreaterThan(0))
    // The old page hardcoded this badge, so a real admin looked like a student.
    expect(screen.queryByText("Student")).not.toBeInTheDocument()
  })

  it("says so when there is no college, rather than showing a blank", async () => {
    route({ ...PROFILE, collegeName: null })
    renderAccount()

    await waitFor(() => expect(screen.getByText(/Not set/)).toBeInTheDocument())
  })

  it("falls back to the email when the profile has no name", async () => {
    route({ ...PROFILE, fullName: null })
    renderAccount()

    await waitFor(() => expect(screen.getAllByText("ada@example.com").length).toBeGreaterThan(0))
  })
})

describe("editing", () => {
  it("saves the edited name and college through the API", async () => {
    renderAccount()
    await waitFor(() => expect(screen.getByRole("button", { name: /edit profile/i })).toBeInTheDocument())

    await userEvent.click(screen.getByRole("button", { name: /edit profile/i }))

    const name = screen.getByLabelText(/full name/i)
    await userEvent.clear(name)
    await userEvent.type(name, "Ada King")
    const college = screen.getByLabelText(/college/i)
    await userEvent.clear(college)
    await userEvent.type(college, "Trinity College")

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === "PATCH")
      expect(patch).toBeDefined()
      expect(JSON.parse((patch![1] as RequestInit).body as string)).toEqual({
        fullName: "Ada King",
        collegeName: "Trinity College",
      })
    })
  })

  it("does not submit an empty name", async () => {
    renderAccount()
    await waitFor(() => expect(screen.getByRole("button", { name: /edit profile/i })).toBeInTheDocument())
    await userEvent.click(screen.getByRole("button", { name: /edit profile/i }))

    await userEvent.clear(screen.getByLabelText(/full name/i))

    // An empty name is not a valid identity, and the button is disabled rather
    // than relying on the server to reject it.
    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled()
  })

  it("saves the college for an account that has no name yet", async () => {
    // A Google account with a blank name mirrors as fullName: null. Save used to
    // be gated on the name field, so the college — the only field such an account
    // can fill in — could never be saved.
    route({ ...PROFILE, fullName: null, collegeName: null })
    renderAccount()
    await waitFor(() => expect(screen.getByRole("button", { name: /edit profile/i })).toBeInTheDocument())

    await userEvent.click(screen.getByRole("button", { name: /edit profile/i }))

    expect(screen.getByLabelText(/full name/i)).toHaveValue("")
    await userEvent.type(screen.getByLabelText(/college/i), "Trinity College")
    expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled()

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === "PATCH")
      expect(patch).toBeDefined()
      // Only the college is sent. An empty fullName would be read server-side as
      // "clear this field", and there is nothing to clear.
      expect(JSON.parse((patch![1] as RequestInit).body as string)).toEqual({
        collegeName: "Trinity College",
      })
    })
  })

  it("leaves an untouched field out of the patch", async () => {
    renderAccount()
    await waitFor(() => expect(screen.getByRole("button", { name: /edit profile/i })).toBeInTheDocument())
    await userEvent.click(screen.getByRole("button", { name: /edit profile/i }))

    await userEvent.clear(screen.getByLabelText(/full name/i))
    await userEvent.type(screen.getByLabelText(/full name/i), "Ada King")

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(([, init]) => (init as RequestInit)?.method === "PATCH")
      expect(JSON.parse((patch![1] as RequestInit).body as string)).toEqual({ fullName: "Ada King" })
    })
  })

  it("keeps the form open and shows the error when the save fails", async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/api/auth/me") && init?.method === "PATCH") {
        return Promise.resolve(jsonResponse({ error: "Name must be 120 characters or fewer" }, 400))
      }
      if (url.includes("/api/auth/me")) return Promise.resolve(jsonResponse(PROFILE))
      if (url.includes("/my-orders")) return Promise.resolve(jsonResponse([]))
      if (url.includes("/my-enrollments")) return Promise.resolve(jsonResponse([]))
      return Promise.resolve(jsonResponse([]))
    })

    renderAccount()
    await waitFor(() => expect(screen.getByRole("button", { name: /edit profile/i })).toBeInTheDocument())
    await userEvent.click(screen.getByRole("button", { name: /edit profile/i }))
    await userEvent.type(screen.getByLabelText(/full name/i), "!")
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }))

    // Closing the form on failure would throw the user's edit away silently.
    expect(await screen.findByRole("alert")).toHaveTextContent(/120 characters/)
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
  })
})

describe("navigation", () => {
  it("starts on the profile section", () => {
    renderAccount()
    expect(screen.getByRole("heading", { name: /personal information/i })).toBeInTheDocument()
  })

  it.each([
    ["My Courses", /my courses/i],
    ["Orders", /^orders$/i],
    ["My Notes", /my notes/i],
    ["3D Models", /3d models/i],
    ["Podcasts", /podcasts/i],
    ["Addresses", /addresses/i],
    ["Wishlist", /wishlist/i],
    ["Notifications", /notifications/i],
    ["Help & Support", /help & support/i],
  ])("switches to the %s section instead of only highlighting it", async (_label, heading) => {
    renderAccount()
    await openSection(heading)

    // The original bug: the sidebar tracked a selection that nothing read, so
    // every entry looked broken.
    await waitFor(() => expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument())
  })

  it("sends the user to Clerk for the settings it does not own", async () => {
    renderAccount()
    await userEvent.click(screen.getByRole("button", { name: /password & security/i }))

    // Reimplementing password handling here would be a second source of truth
    // for credentials Clerk already owns.
    expect(openUserProfile).toHaveBeenCalled()
  })

  it("signs out from the sidebar", async () => {
    renderAccount()
    await userEvent.click(within(sidebar()).getByRole("button", { name: /log out/i }))

    expect(signOut).toHaveBeenCalled()
  })
})

describe("courses and orders", () => {
  it("lists the courses the user is actually enrolled in", async () => {
    route(PROFILE, { "/my-orders": [], "/my-enrollments": ["c1"], "/api/courses": [COURSE] })
    renderAccount()

    await openSection(/my courses/i)
    expect(await screen.findByText("Anatomy of Movement")).toBeInTheDocument()
  })

  it("says so when there are no courses", async () => {
    renderAccount()
    await openSection(/my courses/i)

    expect(await screen.findByText(/not enrolled in any courses/i)).toBeInTheDocument()
  })

  it("shows a real order with its amount, date and status", async () => {
    route(PROFILE, { "/my-orders": [ORDER], "/my-enrollments": ["c1"], "/api/courses": [COURSE] })
    renderAccount()

    await openSection(/^orders$/i)

    expect(await screen.findByText("Anatomy of Movement")).toBeInTheDocument()
    expect(screen.getByText(/₹499/)).toBeInTheDocument()
    expect(screen.getByText("Paid")).toBeInTheDocument()
  })

  it("says so when there are no orders", async () => {
    renderAccount()
    await openSection(/^orders$/i)

    expect(await screen.findByText(/not placed any orders/i)).toBeInTheDocument()
  })

  it("names the course by count when it is no longer in the catalogue", async () => {
    route(PROFILE, { "/my-orders": [ORDER], "/my-enrollments": [], "/api/courses": [] })
    renderAccount()

    await openSection(/^orders$/i)

    // An unpublished course must not blank the row, and inventing a title would
    // be a lie about what was bought.
    expect(await screen.findByText("1 course")).toBeInTheDocument()
  })
})

describe("honest empty states", () => {
  it("explains that a section has no data source rather than faking rows", async () => {
    renderAccount()
    await openSection(/wishlist/i)

    expect(await screen.findByText(/not stored for your account/i)).toBeInTheDocument()
    // The old page rendered a list of invented wishlist items here.
    expect(screen.queryByText(/Add to wishlist/i)).not.toBeInTheDocument()
  })

  it("marks notification preferences as unavailable", async () => {
    renderAccount()
    await openSection(/notifications/i)

    expect(await screen.findByText(/not wired up yet/i)).toBeInTheDocument()
  })
})
