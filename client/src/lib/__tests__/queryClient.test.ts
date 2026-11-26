import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError, TimeoutError, isRetryableApiError } from "../api"
import {
  MAX_QUERY_RETRIES,
  createQueryClient,
  queryRetryDelay,
  shouldRetryQuery,
} from "../queryClient"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("query retry policy", () => {
  it("retries transient failures but not permanent client errors", () => {
    expect(shouldRetryQuery(0, new ApiError(429, "slow down"))).toBe(true)
    expect(shouldRetryQuery(0, new ApiError(503, "unavailable"))).toBe(true)
    expect(shouldRetryQuery(0, new TimeoutError("timed out"))).toBe(true)
    expect(shouldRetryQuery(0, new TypeError("network down"))).toBe(true)
    expect(shouldRetryQuery(0, new ApiError(400, "bad request"))).toBe(false)
    expect(shouldRetryQuery(0, new ApiError(401, "unauthorized"))).toBe(false)
  })

  it("does not retry a caller cancellation", () => {
    expect(shouldRetryQuery(0, new DOMException("Aborted", "AbortError"))).toBe(false)
  })

  it("caps retries", () => {
    expect(shouldRetryQuery(MAX_QUERY_RETRIES - 1, new ApiError(503, "unavailable"))).toBe(true)
    expect(shouldRetryQuery(MAX_QUERY_RETRIES, new ApiError(503, "unavailable"))).toBe(false)
  })

  it("uses a bounded exponential backoff with jitter", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)

    expect(queryRetryDelay(0, new ApiError(503, "unavailable"))).toBe(500)
    expect(queryRetryDelay(1, new ApiError(503, "unavailable"))).toBe(1_000)
    expect(queryRetryDelay(10, new ApiError(503, "unavailable"))).toBe(5_000)
  })

  it("respects Retry-After when the server supplies it", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)

    expect(queryRetryDelay(0, new ApiError(429, "slow down", 1_500))).toBe(1_500)
  })

  it("exposes the policy through the shared QueryClient defaults", () => {
    const queryClient = createQueryClient()
    const retry = queryClient.getDefaultOptions().queries?.retry
    const retryDelay = queryClient.getDefaultOptions().queries?.retryDelay

    expect(retry).toBe(shouldRetryQuery)
    expect(retryDelay).toBe(queryRetryDelay)
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(60_000)
    expect(isRetryableApiError(new ApiError(500, "boom"))).toBe(true)
  })
})
