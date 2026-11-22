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
