import { describe, expect, it } from "vitest"
import { isCommonPassword, PASSWORD_MIN_LENGTH, validatePasswordPolicy } from "../password-policy.js"

describe("validatePasswordPolicy", () => {
  it("rejects passwords shorter than the minimum length", () => {
    expect(validatePasswordPolicy("short1")).not.toBeNull()
    expect(validatePasswordPolicy("a".repeat(PASSWORD_MIN_LENGTH - 1))).not.toBeNull()
  })

  it("accepts long, unique passwords", () => {
    expect(validatePasswordPolicy("correct-horse-battery-staple!!")).toBeNull()
    expect(validatePasswordPolicy("sunsetVelvet-Taurus49!quill")).toBeNull()
  })

  it("rejects passwords from the top-10k blocklist", () => {
    expect(validatePasswordPolicy("unbelievable")).not.toBeNull()
  })

  it("rejects common passwords with suffix digits or case variation", () => {
    expect(validatePasswordPolicy("password123456")).not.toBeNull()
    expect(validatePasswordPolicy("PASSWORD2016")).not.toBeNull()
  })

  it("rejects leet-speak variants of common passwords", () => {
    expect(validatePasswordPolicy("p@ssw0rd12345")).not.toBeNull()
    expect(validatePasswordPolicy("1l0v3y0u777")).not.toBeNull()
  })
})

describe("isCommonPassword", () => {
  it("matches exact, lowercased, and digit-suffixed forms", () => {
    expect(isCommonPassword("password")).toBe(true)
    expect(isCommonPassword("Password")).toBe(true)
    expect(isCommonPassword("P@SSW0RD")).toBe(true)
    expect(isCommonPassword("Password123")).toBe(true)
  })

  it("does not mark unique passwords as common", () => {
    expect(isCommonPassword("hollowgroveKestrel42-mist")).toBe(false)
    expect(isCommonPassword("")).toBe(false)
  })
})