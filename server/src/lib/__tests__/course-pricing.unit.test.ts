import { afterEach, describe, expect, it, vi } from "vitest"

import { ConflictError } from "../errors.js"
import { classifyCoursePricing } from "../course-pricing.js"

const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

afterEach(() => {
  errorSpy.mockClear()
})

describe("classifyCoursePricing", () => {
  it("accepts a free course with zero price", () => {
    expect(classifyCoursePricing({ id: "c1", isFree: true, price: 0 })).toBe("free")
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it("accepts a paid course with a positive price", () => {
    expect(classifyCoursePricing({ id: "c2", isFree: false, price: 12_345 })).toBe("paid")
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it.each([
    { id: "bad1", isFree: true, price: 500 },
    { id: "bad2", isFree: false, price: 0 },
  ])("refuses misconfigured course $id", (course) => {
    expect(() => classifyCoursePricing(course)).toThrow(ConflictError)
    expect(() => classifyCoursePricing(course)).toThrow("Course pricing is misconfigured.")
  })

  it("logs only the course id for a misconfigured course", () => {
    expect(() => classifyCoursePricing({ id: "secret-course-id", isFree: true, price: 999 })).toThrow()
    expect(errorSpy).toHaveBeenCalledTimes(1)
    const line = String(errorSpy.mock.calls[0]?.[0] ?? "")
    expect(line).toContain("secret-course-id")
    expect(line).not.toContain("999")
  })
})
