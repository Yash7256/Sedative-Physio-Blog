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
  isSafeCatalogImageUrl,
} from "../resources"

const validPage = { items: [{ id: "x" }], nextCursor: null }
const validDetail = {
  id: "c1",
  title: "Course",
  slug: "course",
  shortDescription: null,
  thumbnail: null,
  level: "Beginner",
  language: "English",
  estimatedHours: null,
  price: 0,
  isFree: true,
  highlights: [],
  sections: [],
  tutor: null,
}

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

describe("course image URL safety", () => {
  it("allows same-origin paths and absolute URLs", () => {
    expect(isSafeCatalogImageUrl("/images/course.png")).toBe(true)
    expect(isSafeCatalogImageUrl(`${window.location.origin}/images/course.png`)).toBe(true)
  })

  it("refuses protocol-relative, external and malformed URLs", () => {
    expect(isSafeCatalogImageUrl("//tracker.example/pixel.png")).toBe(false)
    expect(isSafeCatalogImageUrl("https://tracker.example/pixel.png")).toBe(false)
    expect(isSafeCatalogImageUrl("javascript:alert(1)")).toBe(false)
    expect(isSafeCatalogImageUrl(null)).toBe(false)
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

describe("course detail response validation", () => {
  it.each([
    { ...validDetail, sections: "not-an-array" },
    { ...validDetail, highlights: [1, 2] },
    {
      ...validDetail,
      sections: [{ id: "s1", title: "Section", description: null, order: 0, lessons: [{ id: "l1", title: "Lesson", slug: "l", type: "VIDEO", duration: null, isPreview: false }] }],
      tutor: { id: "t1", name: 7 },
    },
    { ...validDetail, isFree: true, price: 500 },
  ])("rejects a malformed course detail response with a retryable 502", async (body) => {
    apiMock.apiJson.mockResolvedValueOnce(body)

    await expect(fetchCourseDetail("course")).rejects.toMatchObject({
      status: 502,
      message: "Unexpected course response",
    })
  })

  it("accepts a complete course detail response", async () => {
    apiMock.apiJson.mockResolvedValueOnce(validDetail)

    await expect(fetchCourseDetail("course")).resolves.toEqual(validDetail)
  })
})

describe("direct resource fetches", () => {
  it("passes timeout and abort options to the course detail fetcher", async () => {
    const signal = new AbortController().signal
    apiMock.apiJson.mockResolvedValueOnce(validDetail)

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
