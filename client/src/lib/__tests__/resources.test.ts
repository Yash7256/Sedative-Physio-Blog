import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const apiMock = vi.hoisted(() => ({
  apiJson: vi.fn(),
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.name = "ApiError"
      this.status = status
    }
  },
}))

vi.mock("../api", () => apiMock)

import { DEFAULT_QUERY_TIMEOUT_MS } from "../queryClient"
import {
  fetchCourseDetail,
  fetchCourses,
  fetchNotes,
  formatCoursePrice,
} from "../resources"

const validPage = { items: [{ id: "x" }], nextCursor: null }

beforeEach(() => {
  apiMock.apiJson.mockReset().mockResolvedValue(validPage)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("shared course price formatting", () => {
  it("formats paise without rounding away fractional rupees", () => {
    expect(formatCoursePrice(12_345)).toBe("₹123.45")
    expect(formatCoursePrice(1_000)).toBe("₹10")
    expect(formatCoursePrice(150)).toBe("₹1.50")
  })

  it("treats zero and missing prices as free", () => {
    expect(formatCoursePrice(0)).toBe("Free")
    expect(formatCoursePrice(undefined)).toBe("Free")
  })
})

describe("catalog response validation", () => {
  it.each([
    { items: "not-an-array", nextCursor: null },
    { items: [], nextCursor: 7 },
    null,
  ])("rejects a malformed catalog page with a retryable 502", async (body) => {
    apiMock.apiJson.mockResolvedValueOnce(body)

    await expect(fetchNotes()).rejects.toMatchObject({ status: 502, message: "Unexpected catalog response" })
  })

  it("validates course and model pages too", async () => {
    apiMock.apiJson.mockResolvedValue({ items: [], nextCursor: false })

    await expect(fetchCourses()).rejects.toMatchObject({ status: 502 })
    await expect(fetchNotes()).rejects.toMatchObject({ status: 502 })
  })

  it("accepts a well-formed page", async () => {
    await expect(fetchNotes()).resolves.toEqual(validPage)
  })
})

describe("direct resource fetches", () => {
  it("passes timeout and abort options to the course detail fetcher", async () => {
    const signal = new AbortController().signal
    apiMock.apiJson.mockResolvedValueOnce({ id: "c1", title: "Course" })

    await fetchCourseDetail("course/one", { signal })

    expect(apiMock.apiJson).toHaveBeenCalledWith("/api/courses/course%2Fone", {
      timeoutMs: DEFAULT_QUERY_TIMEOUT_MS,
      signal,
    })
  })

  it("keeps the friendly missing-course error", async () => {
    apiMock.apiJson.mockRejectedValueOnce(new apiMock.ApiError(404, "Not found"))

    await expect(fetchCourseDetail("missing")).rejects.toThrow("Course not found")
  })
})
