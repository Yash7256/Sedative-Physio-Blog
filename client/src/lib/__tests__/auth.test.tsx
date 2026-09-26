import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"

import { AuthProvider, useAuthProfile, type AuthProfile } from "../auth"

/**
 * Clerk is mocked because the unit under test is what this app does with a
 * session, not Clerk's. The real integration is covered by the smoke test
 * against a live server.
 */

// `vi.mock` factories are hoisted above the module body, so they cannot close
// over a `const` declared here — the factory would run while these are still in
// the temporal dead zone. `vi.hoisted` lifts the mocks above the hoisted
// `vi.mock` call so the factory can actually see them.
const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }))

vi.mock("@clerk/clerk-react", () => ({ useAuth }))

const fetchMock = vi.fn()

const PROFILE: AuthProfile = {
  clerkUserId: "user_2abc",
  userId: "clyabc123",
  role: "user",
  email: "ada@example.com",
  fullName: "Ada Lovelace",
  collegeName: null,
  emailVerified: true,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

function signedIn(clerkUserId: string | null) {
  useAuth.mockReturnValue({
    isLoaded: true,
    isSignedIn: clerkUserId !== null,
    userId: clerkUserId ?? undefined,
  })
}

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>

/** Lets the effect's promise chain settle without advancing any timer. */
async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  signedIn(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("signed out", () => {
  it("does not call the API at all", async () => {
    const { result } = renderHook(() => useAuthProfile(), { wrapper })

    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.profile).toBeNull()
    expect(result.current.isSignedIn).toBe(false)
  })

  it("does not fetch while Clerk is still restoring the session", async () => {
    useAuth.mockReturnValue({ isSignedIn: false, isLoaded: false })
    const { result } = renderHook(() => useAuthProfile(), { wrapper })

    await waitFor(() => expect(result.current.isLoaded).toBe(false))
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe("signed in", () => {
  it("loads the app's own profile from /api/auth/me", async () => {
    signedIn("user_2abc")
    fetchMock.mockResolvedValue(jsonResponse(PROFILE))

    const { result } = renderHook(() => useAuthProfile(), { wrapper })

    await waitFor(() => expect(result.current.profile).not.toBeNull())
    expect(result.current.profile).toEqual(PROFILE)
    expect(result.current.error).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/me", expect.objectContaining({ credentials: "include" }))
  })

  it("stays pending rather than erroring while the signup webhook is in flight", async () => {
    // The documented transient state: Clerk returns from sign-up before the
    // `user.created` webhook has created the row, so the first 401 is expected.
    // The backoff is 400+800+1600+3200ms, so this drives fake timers rather than
    // waiting them out.
    vi.useFakeTimers()
    signedIn("user_2abc")
    fetchMock.mockResolvedValue(jsonResponse({ error: "Account not found." }, 401))

    const { result } = renderHook(() => useAuthProfile(), { wrapper })

    await flush()
    expect(result.current.isProfilePending).toBe(true)
    // Not surfaced as an error: nothing is broken, the row is just not there.
    expect(result.current.error).toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    await flush()

    expect(result.current.isProfilePending).toBe(false)
    expect(result.current.profile).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it("retries a 401 and picks up the profile once it lands", async () => {
    vi.useFakeTimers()
    signedIn("user_2abc")
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "Account not found." }, 401))
      .mockResolvedValue(jsonResponse(PROFILE))

    const { result } = renderHook(() => useAuthProfile(), { wrapper })

    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.current.isProfilePending).toBe(true)

    // Past the first backoff step.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.current.profile).toEqual(PROFILE)
    expect(result.current.isProfilePending).toBe(false)
  })

  it("gives up after the backoff instead of polling forever", async () => {
    vi.useFakeTimers()
    signedIn("user_2abc")
    fetchMock.mockResolvedValue(jsonResponse({ error: "Account not found." }, 401))

    const { result } = renderHook(() => useAuthProfile(), { wrapper })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    await flush()

    // One initial attempt plus each backoff step, and no more.
    expect(fetchMock.mock.calls.length).toBe(5)
    expect(result.current.isProfilePending).toBe(false)
  })

  it("surfaces a real failure as an error", async () => {
    signedIn("user_2abc")
    fetchMock.mockResolvedValue(jsonResponse({ error: "Database unavailable" }, 500))

    const { result } = renderHook(() => useAuthProfile(), { wrapper })

    await waitFor(() => expect(result.current.error).toBe("Database unavailable"))
    expect(result.current.profile).toBeNull()
  })

  it("re-reads on demand", async () => {
    signedIn("user_2abc")
    fetchMock.mockResolvedValue(jsonResponse(PROFILE))

    const { result } = renderHook(() => useAuthProfile(), { wrapper })
    await waitFor(() => expect(result.current.profile).not.toBeNull())
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      result.current.refresh()
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })
})

describe("updateProfile", () => {
  it("sends a PATCH to /api/auth/me and adopts the stored result", async () => {
    signedIn("user_2abc")
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE))

    const { result } = renderHook(() => useAuthProfile(), { wrapper })
    await waitFor(() => expect(result.current.profile).not.toBeNull())

    const updated: AuthProfile = { ...PROFILE, fullName: "Ada King", collegeName: "King's College" }
    fetchMock.mockResolvedValueOnce(jsonResponse(updated))

    let saved: AuthProfile | undefined
    await act(async () => {
      saved = await result.current.updateProfile({
        fullName: "Ada King",
        collegeName: "King's College",
      })
    })

    const [, init] = fetchMock.mock.calls[1]
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(init.body)).toEqual({ fullName: "Ada King", collegeName: "King's College" })
    // What the server kept, not what was submitted: a rejected edit must not
    // leave the UI showing a value the database never accepted.
    expect(saved).toEqual(updated)
    expect(result.current.profile).toEqual(updated)
  })

  it("keeps the old profile when the write fails, and surfaces the error", async () => {
    signedIn("user_2abc")
    fetchMock.mockResolvedValueOnce(jsonResponse(PROFILE))

    const { result } = renderHook(() => useAuthProfile(), { wrapper })
    await waitFor(() => expect(result.current.profile).not.toBeNull())

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Name must be 120 characters or fewer" }, 400))

    await act(async () => {
      await expect(
        result.current.updateProfile({ fullName: "x".repeat(200) }),
      ).rejects.toThrow(/120 characters/)
    })

    // Losing the edit on failure would silently revert what the user just typed.
    expect(result.current.profile).toEqual(PROFILE)
  })
})

describe("provider contract", () => {
  it("refuses to be used outside the provider", () => {
    expect(() => renderHook(() => useAuthProfile())).toThrow(/inside <AuthProvider>/)
  })
})
