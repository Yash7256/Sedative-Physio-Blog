import express from "express"
import { describe, expect, it, vi } from "vitest"

import { noStore } from "../cache.js"
import {
  CATALOG_CACHE_POLICY,
  catalogVersionKey,
  createCatalogCache,
} from "../catalog-cache.js"
import { createFakeRedis } from "../../test/fake-redis.js"
import { withServer } from "../../test/harness.js"

function buildApp(cache: ReturnType<typeof createCatalogCache>, loader: () => Promise<unknown>) {
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

describe("shared catalog versions", () => {
  it("invalidates another instance after that instance refreshes its version", async () => {
    const { redis } = createFakeRedis()
    const writer = createCatalogCache(60_000, { redis: redis as any, versionTtlMs: 0 })
    const reader = createCatalogCache(60_000, { redis: redis as any, versionTtlMs: 0 })
    const loader = vi.fn(async () => ({ items: [{ id: "c1" }], nextCursor: null }))

    await withServer(buildApp(reader, loader), async (base) => {
      await fetch(`${base}/api/courses`)
      expect(loader).toHaveBeenCalledTimes(1)
      expect(reader.version("courses")).toBe(0)

      expect(await writer.bumpShared(["courses"])).toEqual([1])

      await fetch(`${base}/api/courses`)
      expect(reader.version("courses")).toBe(1)
      expect(loader).toHaveBeenCalledTimes(2)
    })
  })

  it("uses a stable shared key for a catalog version", () => {
    expect(catalogVersionKey("courses")).toBe("catalog:version:courses")
  })

  it("serves the local cache when Redis reads fail", async () => {
    const brokenRedis = {
      get: vi.fn(async () => {
        throw new Error("redis down")
      }),
      multi: vi.fn(() => {
        throw new Error("redis down")
      }),
    }
    const cache = createCatalogCache(60_000, { redis: brokenRedis as any, versionTtlMs: 0 })
    const loader = vi.fn(async () => ({ items: [], nextCursor: null }))

    await withServer(buildApp(cache, loader), async (base) => {
      const first = await fetch(`${base}/api/courses`)
      const second = await fetch(`${base}/api/courses`)
      expect(first.status).toBe(200)
      expect(second.status).toBe(200)
      expect(loader).toHaveBeenCalledTimes(1)
      expect(cache.version("courses")).toBe(0)
    })
  })

  it("refuses a shared bump when Redis is unavailable", async () => {
    const brokenRedis = {
      multi: vi.fn(() => {
        throw new Error("redis down")
      }),
    }
    const cache = createCatalogCache(60_000, { redis: brokenRedis as any })

    await expect(cache.bumpShared(["courses"])).rejects.toThrow()
    expect(cache.version("courses")).toBe(0)
  })
})
