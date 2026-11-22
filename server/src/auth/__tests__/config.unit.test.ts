import { describe, expect, it } from "vitest"

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
