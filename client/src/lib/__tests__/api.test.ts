import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError, apiFetch, apiJson } from "../api"

/**
 * The whole point of this module is one line: `credentials: "include"`. Without
 * it Clerk's HttpOnly session cookie is never attached and every authenticated
 * request is silently anonymous. That failure is invisible in development —
 * `VITE_API_URL` is empty there, so requests are same-origin through the Vite
 * proxy and the default `same-origin` credential mode happens to work — and only
 * appears once the API is on its own origin. So it gets a test that fails loudly
 * if anyone drops the option.
 */

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("credentials", () => {
  it("attaches credentials so the Clerk session cookie is sent", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
    await apiJson("/api/auth/me")
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "include" })
  })

  it("attaches them on the raw-fetch path too", async () => {
    fetchMock.mockResolvedValue(new Response("bytes"))
    await apiFetch("/api/notes/1/file")
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "include" })
  })

  it("does not let a caller opt out by passing its own init", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
    // `credentials` is applied after the spread, so an explicit "omit" cannot
    // reintroduce the bug from a call site.
    await apiJson("/api/auth/me", { credentials: "omit" } as RequestInit)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "include" })
  })
})

describe("requests", () => {
  it("prefixes the configured API base", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await apiJson("/api/notes")
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/notes")
  })

  it("sets a JSON content type for string bodies only", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    await apiJson("/api/a", { method: "POST", body: JSON.stringify({ a: 1 }) })
    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers
    expect(headers.get("content-type")).toBe("application/json")

    fetchMock.mockResolvedValue(new Response("bytes"))
    await apiFetch("/api/b", { method: "POST", body: new Blob(["x"]) })
    const blobHeaders = (fetchMock.mock.calls[1]?.[1] as RequestInit).headers as Headers
    expect(blobHeaders.get("content-type")).toBeNull()
  })

  it("respects a caller-supplied content type", async () => {
    fetchMock.mockResolvedValue(new Response("bytes"))
    await apiFetch("/api/c", { method: "POST", body: "raw", headers: { "content-type": "text/plain" } })
    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers
    expect(headers.get("content-type")).toBe("text/plain")
  })
})

describe("errors", () => {
  it("surfaces the server's own message", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Account not found." }, 401))
    await expect(apiJson("/api/auth/me")).rejects.toThrow("Account not found.")
  })

  it("carries the status, and flags 401 specifically", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "nope" }, 401))
    const err = await apiJson("/api/auth/me").catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(401)
    expect((err as ApiError).isUnauthorized).toBe(true)
  })

  it("does not treat other statuses as unauthorized", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "boom" }, 500))
    const err = (await apiJson("/api/auth/me").catch((e: unknown) => e)) as ApiError
    expect(err.isUnauthorized).toBe(false)
  })

  it("falls back to the status when the body is not the expected shape", async () => {
    fetchMock.mockResolvedValue(new Response("<html>502</html>", { status: 502 }))
    await expect(apiJson("/api/x")).rejects.toThrow("Request failed with status 502")
  })

  it("falls back when the error body is JSON with no message", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 400))
    await expect(apiJson("/api/x")).rejects.toThrow("Request failed with status 400")
  })

  it("does not throw on a successful response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }))
    await expect(apiJson("/api/x")).resolves.toEqual({ id: 1 })
  })
})
