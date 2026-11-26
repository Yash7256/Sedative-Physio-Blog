import express from "express"
import { describe, expect, it, vi } from "vitest"

import { noStore } from "../cache.js"
import {
  CATALOG_CACHE_POLICY,
  createCatalogCache,
} from "../catalog-cache.js"
import { serverTimingHeader, timingAllowOrigin } from "../timing.js"
import { withServer } from "../../test/harness.js"

function buildApp(loader: () => Promise<unknown>) {
  const cache = createCatalogCache()
  const app = express()
  app.set("etag", false)
  app.use(noStore())
  app.get(
    "/api/courses",
    cache.middleware({ catalog: "courses", policy: CATALOG_CACHE_POLICY }),
    async (_req, res) => {
      res.json(await loader())
    },
  )
  return app
}

function segments(header: string | null): string[] {
  return (header ?? "").split(",").map((part) => part.trim().split(";")[0] ?? "")
}

describe("catalog Server-Timing", () => {
  it("emits a load segment only on a cache miss", async () => {
    const loader = vi.fn(async () => ({ items: [{ id: "c1" }], nextCursor: null }))
    const app = buildApp(loader)

    await withServer(app, async (base) => {
      const miss = await fetch(`${base}/api/courses`)
      expect(miss.status).toBe(200)
      expect(segments(miss.headers.get("server-timing"))).toEqual(["cache", "load"])

      const hit = await fetch(`${base}/api/courses`)
      expect(hit.status).toBe(200)
      expect(segments(hit.headers.get("server-timing"))).toEqual(["cache"])
      expect(loader).toHaveBeenCalledTimes(1)
    })
  })

  it("keeps the same timing shape on a conditional 304", async () => {
    const loader = vi.fn(async () => ({ items: [], nextCursor: null }))
    const app = buildApp(loader)

    await withServer(app, async (base) => {
      const first = await fetch(`${base}/api/courses`)
      const etag = first.headers.get("etag")!
      const second = await fetch(`${base}/api/courses`, { headers: { "If-None-Match": etag } })

      expect(second.status).toBe(304)
      expect(segments(second.headers.get("server-timing"))).toEqual(["cache"])
      expect(loader).toHaveBeenCalledTimes(1)
    })
  })

  it("formats durations without echoing configuration or user data", () => {
    const hit = serverTimingHeader(0.25)
    const miss = serverTimingHeader(0.25, 4.125)

    expect(hit).toMatch(/^cache;dur=0\.250;desc="catalog lookup"$/)
    expect(miss).toMatch(/^cache;dur=0\.250;desc="catalog lookup", load;dur=4\.125;desc="catalog load"$/)
    expect(miss).not.toMatch(/pk_|sk_|user_|Bearer|@/)
  })

  it("allows timing only for configured origins", async () => {
    const app = express()
    app.use(timingAllowOrigin(["https://app.example", "https://admin.example"]))
    app.get("/", (_req, res) => {
      res.json({ ok: true })
    })

    await withServer(app, async (base) => {
      const res = await fetch(`${base}/`)
      expect(res.headers.get("timing-allow-origin")).toBe(
        "https://app.example, https://admin.example",
      )
    })
  })

  it("omits Timing-Allow-Origin when no origins are configured", async () => {
    const app = express()
    app.use(timingAllowOrigin([]))
    app.get("/", (_req, res) => {
      res.json({ ok: true })
    })

    await withServer(app, async (base) => {
      const res = await fetch(`${base}/`)
      expect(res.headers.get("timing-allow-origin")).toBeNull()
    })
  })
})
