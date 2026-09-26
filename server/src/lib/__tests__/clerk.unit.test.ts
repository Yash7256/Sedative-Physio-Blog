import { describe, expect, it } from "vitest"

import { readAuth, readAuthUserId } from "../clerk.js"

/**
 * `req.auth` is attached by `clerkMiddleware()` as a function and is not typed
 * on Express's Request at all, so every consumer goes through `readAuth`. These
 * cover the narrowing that all of them depend on.
 */
function requestWith(auth: unknown) {
  return { auth } as unknown as import("express").Request
}

describe("readAuth", () => {
  it("returns the object from Clerk's auth function", () => {
    const session = { userId: "user_abc", sessionId: "sess_1" }
    expect(readAuth(requestWith(() => session))).toBe(session)
  })

  it("passes the request through as `this`", () => {
    // Clerk may resolve session state lazily against the request, so dropping
    // the receiver would break it.
    const req = requestWith(function (this: unknown) {
      return this === req ? { userId: "user_abc" } : { userId: "wrong" }
    })
    expect(readAuth(req)?.userId).toBe("user_abc")
  })

  it("returns null when the function resolves nothing", () => {
    expect(readAuth(requestWith(() => undefined))).toBeNull()
  })

  it("returns null when clerkMiddleware has not run", () => {
    // A missing mount should read as "anonymous" and 401, not crash the route
    // with an opaque TypeError.
    expect(readAuth(requestWith(undefined))).toBeNull()
  })

  it("returns null when req.auth is present but not callable", () => {
    expect(readAuth(requestWith({ userId: "user_abc" }))).toBeNull()
    expect(readAuth(requestWith("nonsense"))).toBeNull()
  })
})

describe("readAuthUserId", () => {
  it("returns the Clerk user id when signed in", () => {
    expect(readAuthUserId(requestWith(() => ({ userId: "user_abc" })))).toBe("user_abc")
  })

  it("returns null for a signed-out session", () => {
    expect(readAuthUserId(requestWith(() => ({ userId: null })))).toBeNull()
  })

  it("returns null when auth is unavailable", () => {
    expect(readAuthUserId(requestWith(undefined))).toBeNull()
  })
})
