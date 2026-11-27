import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError, apiFetch, apiJson, isRetryableApiError, parseRetryAfterMs } from "../api"

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("retry metadata", () => {
  it("parses a numeric Retry-After header into milliseconds", () => {
    expect(parseRetryAfterMs("3", 1_000)).toBe(3_000)
  })

  it("carries Retry-After on an ApiError", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "slow down" }, 429, { "retry-after": "2" }))

    const err = (await apiJson("/api/courses").catch((e: unknown) => e)) as ApiError

    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(429)
    expect(err.retryAfterMs).toBe(2_000)
  })

  it("classifies retryable and permanent failures", () => {
    expect(isRetryableApiError(new ApiError(429, "slow down"))).toBe(true)
    expect(isRetryableApiError(new ApiError(503, "unavailable"))).toBe(true)
    expect(isRetryableApiError(new ApiError(400, "bad request"))).toBe(false)
    expect(isRetryableApiError(new ApiError(401, "unauthorized"))).toBe(false)
    expect(isRetryableApiError(new TypeError("network down"))).toBe(true)
  })
})

describe("request cancellation", () => {
  it("passes a caller AbortSignal through to fetch", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
    const controller = new AbortController()

    await apiFetch("/api/courses", { signal: controller.signal })

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ signal: controller.signal })
  })

  it("aborts a request once its timeout expires", async () => {
    fetchMock.mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
    }))

    await expect(apiFetch("/api/courses", { timeoutMs: 5 })).rejects.toThrow(/timed out/i)
  })
})

describe("apiJson response parsing", () => {
  it("rejects a non-JSON success response with a retryable 502", async () => {
    fetchMock.mockResolvedValue(new Response("<html>not json</html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    }))

    const err = (await apiJson("/api/courses").catch((e: unknown) => e)) as ApiError

    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(502)
    expect(isRetryableApiError(err)).toBe(true)
  })

  it("keeps a TypeError thrown by fetch retryable", async () => {
    fetchMock.mockRejectedValue(new TypeError("network down"))

    const err = await apiJson("/api/courses").catch((e: unknown) => e)

    expect(err).toBeInstanceOf(TypeError)
    expect(isRetryableApiError(err)).toBe(true)
  })

  it("does not retry a TypeError caused by parsing the client-side body", async () => {
    fetchMock.mockResolvedValue(new Response("{broken", {
      status: 200,
      headers: { "content-type": "application/json" },
    }))

    const err = await apiJson("/api/courses").catch((e: unknown) => e)

    expect(err).not.toBeInstanceOf(TypeError)
    expect((err as Error).message).toMatch(/invalid json response/i)
    expect(isRetryableApiError(err)).toBe(false)
  })
})
