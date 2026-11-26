import express from "express"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CATALOG_CACHE_POLICY, createCatalogCache } from "../catalog-cache.js"
import { withServer } from "../../test/harness.js"

function buildApp(loader: () => Promise<unknown>) {
  const cache = createCatalogCache(60_000, { env: {} })
  const app = express()
  app.set("etag", false)
  app.get(
    "/api/courses",
    cache.middleware({ catalog: "courses", policy: CATALOG_CACHE_POLICY }),
    async (_req, res) => {
      res.json(await loader())
    },
  )
  return app
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("pre-serialized catalog responses", () => {
  it("returns byte-identical JSON on hit without serializing the body again", async () => {
    const body = { items: [{ id: "c1", title: "Course" }], nextCursor: null }
    const stringify = vi.spyOn(JSON, "stringify")
    const app = buildApp(async () => body)

    await withServer(app, async (base) => {
      const miss = await fetch(`${base}/api/courses`)
      const missText = await miss.text()
      const hit = await fetch(`${base}/api/courses`)
      const hitText = await hit.text()

      expect(miss.status).toBe(200)
      expect(hit.status).toBe(200)
      expect(hitText).toBe(missText)
      expect(hit.headers.get("content-type")).toBe("application/json; charset=utf-8")
      expect(hit.headers.get("etag")).toBe(miss.headers.get("etag"))

      const bodySerializations = stringify.mock.calls.filter(([value]) => value === body)
      expect(bodySerializations).toHaveLength(1)
    })
  })

  it("answers a conditional hit with 304 and no body", async () => {
    const app = buildApp(async () => ({ items: [], nextCursor: null }))

    await withServer(app, async (base) => {
      const first = await fetch(`${base}/api/courses`)
      const etag = first.headers.get("etag")
      expect(etag).toBeTruthy()

      const second = await fetch(`${base}/api/courses`, {
        headers: { "If-None-Match": etag! },
      })

      expect(second.status).toBe(304)
      expect(await second.text()).toBe("")
      expect(second.headers.get("etag")).toBe(etag)
    })
  })
})
