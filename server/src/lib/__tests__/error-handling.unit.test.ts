import express from "express"
import { describe, expect, it, vi } from "vitest"

import { errorHandler } from "../errors.js"
import { withServer } from "../../test/harness.js"

vi.doMock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.doMock("../../auth/config.js", () => ({
  getAuthorizedParties: () => [],
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
})
