import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { fetchEnrolledCourses, fetchMyOrders, formatDate, formatMoney } from "../account"
import type { CourseSummary } from "../resources"

/**
 * The account page is the first thing to render whatever these return, so the
 * shapes and the edge cases are pinned here rather than only in the component
 * test. The component test mocks this module; without these, nothing would check
 * that the types line up with the server.
 */

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

/** Answers each endpoint the account page hits, keyed by path suffix. */
function route(routes: Record<string, unknown>) {
  fetchMock.mockImplementation((url: string) => {
    const match = Object.keys(routes).find((path) => url.includes(path))
    if (!match) return Promise.reject(new Error(`unexpected request to ${url}`))
    return Promise.resolve(jsonResponse(routes[match]))
  })
}

const course = (id: string, title: string): CourseSummary => ({
  id,
  title,
  slug: id,
  shortDescription: null,
  thumbnail: null,
  level: "Beginner",
  language: "English",
  estimatedHours: 5,
  price: 49900,
  isFree: false,
})

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("fetchEnrolledCourses", () => {
  it("pairs enrollment ids with their course details", async () => {
    route({
      "/my-enrollments": ["c1", "c2"],
      "/api/courses": [course("c1", "Anatomy"), course("c2", "Physiology"), course("c3", "Unrelated")],
    })

    const result = await fetchEnrolledCourses()

    expect(result.map((r) => r.course.title)).toEqual(["Anatomy", "Physiology"])
  })

  it("drops an enrollment whose course is no longer published", async () => {
    route({ "/my-enrollments": ["c1", "gone"], "/api/courses": [course("c1", "Anatomy")] })

    const result = await fetchEnrolledCourses()

    // Surfacing a blank row for a course the user cannot open is worse than
    // omitting it.
    expect(result).toHaveLength(1)
    expect(result[0].courseId).toBe("c1")
  })

  it("does not fetch the catalogue when there is nothing enrolled", async () => {
    route({ "/my-enrollments": [] })

    expect(await fetchEnrolledCourses()).toEqual([])
    // An empty account should not pay for a full catalogue request.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("does not fetch the catalogue when the enrollment request itself fails", async () => {
    route({})

    await expect(fetchEnrolledCourses()).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe("fetchMyOrders", () => {
  it("returns the orders as the server sent them", async () => {
    route({
      "/my-orders": [
        { id: "o1", amount: 49900, currency: "INR", status: "PAID", courseIds: ["c1"], createdAt: "2026-08-02T00:00:00.000Z" },
      ],
    })

    const orders = await fetchMyOrders()

    expect(orders).toEqual([
      { id: "o1", amount: 49900, currency: "INR", status: "PAID", courseIds: ["c1"], createdAt: "2026-08-02T00:00:00.000Z" },
    ])
  })
})

describe("formatMoney", () => {
  it("converts paise to rupees", () => {
    expect(formatMoney(49900)).toBe("₹499")
  })

  it("keeps a fractional rupee amount", () => {
    expect(formatMoney(49950)).toBe("₹499.5")
  })

  it("handles zero", () => {
    expect(formatMoney(0)).toBe("₹0")
  })

  it("falls back to a currency code for a non-rupee order", () => {
    expect(formatMoney(1000, "USD")).toBe("USD 10")
  })
})

describe("formatDate", () => {
  it("renders a readable date", () => {
    expect(formatDate("2026-08-02T00:00:00.000Z")).toMatch(/2026/)
  })

  it("shows a dash rather than 'Invalid Date'", () => {
    // A malformed date reaching the page should not print the string NaN.
    expect(formatDate("not-a-date")).toBe("—")
  })
})
