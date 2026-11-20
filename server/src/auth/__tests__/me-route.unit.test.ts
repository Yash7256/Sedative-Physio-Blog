import express from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { anonymous, asUser, fakeAuth, withServer, type FakeSession } from "../../test/harness.js"

const getOrCreateAuthProfile = vi.fn()
const updateAuthProfile = vi.fn()

vi.mock("../services/me.js", () => ({
  getOrCreateAuthProfile: (...args: unknown[]) => getOrCreateAuthProfile(...args),
}))

vi.mock("../services/profile-update.js", () => ({
  updateAuthProfile: (...args: unknown[]) => updateAuthProfile(...args),
}))

const { meRouter } = await import("../routes/me.js")

function appFor(session: FakeSession) {
  const app = express()
  app.use(express.json())
  fakeAuth(app, session)
  app.use("/me", meRouter)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
  getOrCreateAuthProfile.mockResolvedValue({
    userId: "local_1",
    clerkUserId: "user_test",
    email: "test@example.com",
    fullName: "Test User",
    collegeName: null,
  })
  updateAuthProfile.mockResolvedValue({ userId: "local_1" })
})

describe("/api/auth/me", () => {
  it("rejects an anonymous GET with 401", async () => {
    const response = await withServer(appFor(anonymous), (baseUrl) => fetch(`${baseUrl}/me`))
    expect(response.status).toBe(401)
    expect(getOrCreateAuthProfile).not.toHaveBeenCalled()
  })

  it("returns the caller's own profile for a signed-in GET", async () => {
    const app = appFor(asUser("user_abc"))
    const response = await withServer(app, (baseUrl) => fetch(`${baseUrl}/me`))
    expect(response.status).toBe(200)
    expect(getOrCreateAuthProfile).toHaveBeenCalledWith("user_abc")
  })

  it("rejects a PATCH with a non-string field", async () => {
    const response = await withServer(appFor(asUser()), (baseUrl) =>
      fetch(`${baseUrl}/me`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ collegeName: 123 }),
      }),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "collegeName must be a string" })
    expect(updateAuthProfile).not.toHaveBeenCalled()
  })

  it("forwards only the profile fields a user may edit", async () => {
    const response = await withServer(appFor(asUser("user_abc")), (baseUrl) =>
      fetch(`${baseUrl}/me`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName: "New Name", email: "other@example.com" }),
      }),
    )
    expect(response.status).toBe(200)
    expect(updateAuthProfile).toHaveBeenCalledWith("user_abc", { fullName: "New Name" })
  })

  it("rejects an anonymous PATCH with 401", async () => {
    const response = await withServer(appFor(anonymous), (baseUrl) =>
      fetch(`${baseUrl}/me`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName: "New Name" }),
      }),
    )
    expect(response.status).toBe(401)
  })
})
