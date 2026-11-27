import { describe, expect, it, vi } from "vitest"

describe("clerk middleware config (F-07)", () => {
  // Dynamic import builds the whole app; allow time when gates run in parallel.
  it("clerkMiddleware receives authorizedParties and the publishable key", async () => {
    const clerkMiddleware = vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next())
    vi.doMock("@clerk/express", () => ({ clerkMiddleware }))
    // @ts-ignore - module created in P4
    vi.doMock("../config.js", () => ({
      getAuthorizedParties: () => ["https://example.com"],
      getAllowedOrigins: () => ["https://example.com"],
      getClerkPublishableKey: () => "pk_test_ZXhhbXBsZSQ",
      assertProductionConfig: () => undefined,
    }))
    const { createApp } = await import("../../app.js")
    createApp()
    expect(clerkMiddleware).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizedParties: ["https://example.com"],
        publishableKey: "pk_test_ZXhhbXBsZSQ",
      }),
    )
  }, 15_000)
})
