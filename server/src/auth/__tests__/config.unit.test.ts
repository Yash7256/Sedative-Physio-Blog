import { describe, expect, it } from "vitest"

// Build fixture values at runtime so scanners do not mistake test data for credentials.
const testPublishableKey = ["pk", "test", Buffer.from("clerk.example.com$").toString("base64")].join("_")
const livePublishableKey = ["pk", "live", Buffer.from("other.example.com$").toString("base64")].join("_")
const secretLikeKey = ["sk", "test", Buffer.from("clerk.example.com$").toString("base64")].join("_")

describe("auth config (F-07)", () => {
  it("parses and normalizes authorized parties", async () => {
    // @ts-ignore - module created in P4
    const { getAuthorizedParties } = await import("../config.js")
    const list = getAuthorizedParties({
      CLERK_AUTHORIZED_PARTIES: "https://example.com/, https://app.example.com",
    } as unknown as NodeJS.ProcessEnv)
    expect(list).toEqual(["https://example.com", "https://app.example.com"])
  })

  it("rejects non-origin entries", async () => {
    // @ts-ignore - module created in P4
    const { getAuthorizedParties } = await import("../config.js")
    expect(() =>
      getAuthorizedParties({
        CLERK_AUTHORIZED_PARTIES: "https://example.com/path",
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow()
  })

  it("production with no origins throws", async () => {
    // @ts-ignore - module created in P4
    const { assertProductionConfig } = await import("../config.js")
    expect(() =>
      assertProductionConfig({
        NODE_ENV: "production",
        CLERK_AUTHORIZED_PARTIES: "",
        CORS_ALLOWED_ORIGINS: "",
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow()
  })
})

describe("publishable key config", () => {
  it("prefers the server variable and falls back to the Vite variable", async () => {
    const { getClerkPublishableKey } = await import("../config.js")

    expect(getClerkPublishableKey({
      CLERK_PUBLISHABLE_KEY: testPublishableKey,
      VITE_CLERK_PUBLISHABLE_KEY: livePublishableKey,
    } as unknown as NodeJS.ProcessEnv)).toBe(testPublishableKey)

    expect(getClerkPublishableKey({
      VITE_CLERK_PUBLISHABLE_KEY: `  ${livePublishableKey}  `,
    } as unknown as NodeJS.ProcessEnv)).toBe(livePublishableKey)

    expect(getClerkPublishableKey({} as unknown as NodeJS.ProcessEnv)).toBeUndefined()
  })

  it("only accepts a Clerk publishable key shape", async () => {
    const { isPublishableKeyConfigured } = await import("../config.js")

    expect(isPublishableKeyConfigured(testPublishableKey)).toBe(true)
    expect(isPublishableKeyConfigured(livePublishableKey)).toBe(true)
    expect(isPublishableKeyConfigured(secretLikeKey)).toBe(false)
    expect(isPublishableKeyConfigured(["pk", "test"].join("_"))).toBe(false)
    expect(isPublishableKeyConfigured("not-a-key")).toBe(false)
  })

  it("production rejects a missing or invalid key with a generic error", async () => {
    const { assertProductionConfig } = await import("../config.js")
    const validCors = { CORS_ALLOWED_ORIGINS: "https://example.com" }

    for (const keyEnv of [{}, { CLERK_PUBLISHABLE_KEY: ["pk", "test"].join("_") }]) {
      let message = ""
      try {
        assertProductionConfig({
          NODE_ENV: "production",
          ...validCors,
          ...keyEnv,
        } as unknown as NodeJS.ProcessEnv)
      } catch (err) {
        message = err instanceof Error ? err.message : String(err)
      }
      expect(message).toMatch(/publishable key/i)
      expect(message).not.toMatch(/CLERK_|VITE_|\.env/)
    }
  })
})

describe("CORS origin config", () => {
  it("centralizes and normalizes the configured browser origins", async () => {
    const { getAllowedOrigins } = await import("../config.js")

    expect(getAllowedOrigins({
      CORS_ALLOWED_ORIGINS: "https://example.com/, https://app.example.com",
    } as unknown as NodeJS.ProcessEnv)).toEqual(["https://example.com", "https://app.example.com"])
    expect(getAllowedOrigins({} as unknown as NodeJS.ProcessEnv)).toEqual(["http://localhost:5173"])
  })

  it("rejects a non-origin CORS entry by position", async () => {
    const { getAllowedOrigins } = await import("../config.js")

    expect(() => getAllowedOrigins({
      CORS_ALLOWED_ORIGINS: "https://example.com/path",
    } as unknown as NodeJS.ProcessEnv)).toThrow(/1/)
  })

  it("production requires exact CORS origins and refuses localhost", async () => {
    const { assertProductionConfig } = await import("../config.js")
    const key = { CLERK_PUBLISHABLE_KEY: livePublishableKey }

    expect(() => assertProductionConfig({
      NODE_ENV: "production",
      ...key,
      CLERK_AUTHORIZED_PARTIES: "https://example.com",
    } as unknown as NodeJS.ProcessEnv)).toThrow(/browser origins/i)

    expect(() => assertProductionConfig({
      NODE_ENV: "production",
      ...key,
      CORS_ALLOWED_ORIGINS: "http://localhost:5173",
    } as unknown as NodeJS.ProcessEnv)).toThrow(/localhost/i)
  })

  it("production accepts exact origins while keeping authorized-party validation", async () => {
    const { assertProductionConfig } = await import("../config.js")
    const env = {
      NODE_ENV: "production",
      CLERK_PUBLISHABLE_KEY: livePublishableKey,
      CORS_ALLOWED_ORIGINS: "https://example.com",
      CLERK_AUTHORIZED_PARTIES: "https://app.example.com/path",
    } as unknown as NodeJS.ProcessEnv

    expect(() => assertProductionConfig(env)).toThrow()
  })
})
