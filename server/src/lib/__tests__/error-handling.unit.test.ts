import express from "express"
import { describe, expect, it, vi } from "vitest"

import { errorHandler, handleError } from "../errors.js"
import { withServer } from "../../test/harness.js"

vi.doMock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.doMock("../../auth/config.js", () => ({
  getAuthorizedParties: () => [],
  getAllowedOrigins: () => ["http://localhost:5173"],
  getClerkPublishableKey: () => undefined,
  assertProductionConfig: () => undefined,
}))

const { createApp } = await import("../../app.js")

describe("JSON error handling (F-11)", () => {
  it("malformed JSON returns a stack-free 400 JSON body", async () => {
    const res = await withServer(createApp(), (baseUrl) =>
      fetch(`${baseUrl}/api/contact`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    )

    const body = (await res.json()) as Record<string, unknown>
    expect(res.status).toBe(400)
    expect(body).toEqual({ error: "Malformed JSON body." })
    expect(body).not.toHaveProperty("stack")
  })

  it("a non-JSON webhook body returns 400 JSON without a stack", async () => {
    const res = await withServer(createApp(), (baseUrl) =>
      fetch(`${baseUrl}/api/auth/webhooks/clerk`, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "not json",
      }),
    )

    const body = (await res.json()) as Record<string, unknown>
    expect(res.status).toBe(400)
    expect(body).not.toHaveProperty("stack")
    expect(JSON.stringify(body)).not.toContain("body-parser")
  })

  it("an unexpected error returns 500 JSON with no stack or message leak", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const app = express()
    app.get("/boom", () => {
      throw new Error("stack-marker-should-not-leak")
    })
    app.use(errorHandler)

    const res = await withServer(app, (baseUrl) => fetch(`${baseUrl}/boom`))
    const text = await res.text()
    log.mockRestore()

    expect(res.status).toBe(500)
    expect(text).toBe('{"error":"Internal server error"}')
    expect(text).not.toContain("stack-marker-should-not-leak")
    expect(text).not.toContain("stack")
  })

  it("logs safe method, route pattern and request id for an unexpected error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const app = express()
    app.get("/api/widgets/:id", () => {
      throw Object.assign(new Error("user@example.com tok_secret"), {
        name: "ThirdParty_Error!",
      })
    })
    app.use(errorHandler)

    const res = await withServer(app, (baseUrl) =>
      fetch(`${baseUrl}/api/widgets/42?email=user@example.com`, {
        headers: { "x-vercel-request-id": "req_abc123" },
      }),
    )
    const logged = JSON.stringify(log.mock.calls)
    log.mockRestore()

    expect(res.status).toBe(500)
    expect(logged).toContain("GET")
    expect(logged).toContain("/api/widgets/:id")
    expect(logged).toContain("req_abc123")
    expect(logged).not.toContain("user@example.com")
    expect(logged).not.toContain("tok_secret")
    expect(logged).not.toContain("42?email")
  })

  it("ignores a PII-shaped request id and does not echo an error message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const app = express()
    app.post("/api/widgets", (req, res) => {
      handleError(new Error("contact@example.com private-upstream-detail"), res, req)
    })

    await withServer(app, (baseUrl) =>
      fetch(`${baseUrl}/api/widgets`, {
        method: "POST",
        headers: { "x-request-id": "contact@example.com" },
      }),
    )
    const logged = JSON.stringify(log.mock.calls)
    log.mockRestore()

    expect(logged).toContain("POST")
    expect(logged).not.toContain("contact@example.com")
    expect(logged).not.toContain("private-upstream-detail")
  })
})
