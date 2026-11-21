import express from "express"
import { describe, expect, it, vi } from "vitest"

import { withServer } from "../../test/harness.js"

describe("images limiter wiring", () => {
  it("mounts a shared per-IP limiter on image requests", async () => {
    const createLimiter = vi.fn(() => (_req: unknown, res: any) => {
      res.status(429).json({ error: "limited" })
    })
    vi.resetModules()
    vi.doMock("../../lib/rate-limit.js", () => ({ createLimiter }))
    const { imagesRouter } = await import("../router.js")

    const app = express()
    app.use("/api/images", imagesRouter)
    const res = await withServer(app, (baseUrl) => fetch(`${baseUrl}/api/images?src=/x.png`))

    expect(res.status).toBe(429)
    expect(createLimiter).toHaveBeenCalledWith(
      expect.objectContaining({ prefix: "images", limit: 120 }),
    )
    vi.doUnmock("../../lib/rate-limit.js")
  })
})
