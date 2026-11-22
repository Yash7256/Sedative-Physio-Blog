import express from "express"
import { describe, expect, it } from "vitest"

import { withServer } from "../../test/harness.js"

describe("images router (F-12)", () => {
  it("rejects same-origin path src", async () => {
    const { imagesRouter } = await import("../router.js")
    const app = express()
    app.use("/api/images", imagesRouter)
    const res = await withServer(app, (baseUrl) => fetch(`${baseUrl}/api/images?src=/x.png`))
    expect(res.status).toBe(400)
  })

  it("rejects non-allowlisted remote host", async () => {
    const { imagesRouter } = await import("../router.js")
    const app = express()
    app.use("/api/images", imagesRouter)
    const res = await withServer(app, (baseUrl) => fetch(`${baseUrl}/api/images?src=https://evil.example/x.png`))
    expect(res.status).toBe(400)
  })
})
