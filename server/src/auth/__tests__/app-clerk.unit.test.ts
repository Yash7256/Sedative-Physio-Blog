import { describe, expect, it, vi } from "vitest"

describe("clerk middleware config (F-07)", () => {
  it("clerkMiddleware receives authorizedParties", async () => {
    const clerkMiddleware = vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next())
    vi.doMock("@clerk/express", () => ({ clerkMiddleware }))
    // @ts-ignore - module created in P4
    vi.doMock("../config.js", () => ({
      getAuthorizedParties: () => ["https://example.com"],
      assertProductionConfig: () => undefined,
    }))
    const { createApp } = await import("../../app.js")
    createApp()
    expect(clerkMiddleware).toHaveBeenCalledWith(
      expect.objectContaining({ authorizedParties: ["https://example.com"] }),
    )
  })
})
