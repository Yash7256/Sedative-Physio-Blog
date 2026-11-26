import express from "express"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createCatalogCache, type CatalogName } from "../../lib/catalog-cache.js"
import { createFakeRedis } from "../../test/fake-redis.js"
import { asUser, fakeAuth, withServer } from "../../test/harness.js"
import { createCacheRouter } from "../router.js"

type Purge = (catalogs: readonly CatalogName[]) => Promise<void>

function appFor(cache: ReturnType<typeof createCatalogCache>, purge: Purge) {
  const app = express()
  app.use(express.json())
  fakeAuth(app, asUser("user_admin"))
  app.use("/cache", createCacheRouter({ cache, purge }))
  return app
}

const purgeRequest = (base: string, body?: unknown) =>
  fetch(`${base}/cache/purge`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

beforeEach(() => {
  process.env.CACHE_ADMIN_USER_IDS = "user_admin"
})

afterEach(() => {
  delete process.env.CACHE_ADMIN_USER_IDS
})

describe("catalog purge with shared versions", () => {
  it("bumps the shared version after a successful CDN purge", async () => {
    const { redis } = createFakeRedis()
    const cache = createCatalogCache(60_000, { redis: redis as any })
    const purge = vi.fn<Purge>().mockResolvedValue(undefined)

    await withServer(appFor(cache, purge), async (base) => {
      const res = await purgeRequest(base, { catalogs: ["courses"] })
      expect(res.status).toBe(200)
      expect(purge).toHaveBeenCalledWith(["courses"])
      expect(cache.version("courses")).toBe(1)
    })
  })

  it("fails closed before purging the CDN when no shared store is configured", async () => {
    const cache = createCatalogCache(60_000, { env: {} })
    const purge = vi.fn<Purge>().mockResolvedValue(undefined)

    await withServer(appFor(cache, purge), async (base) => {
      const res = await purgeRequest(base, { catalogs: ["courses"] })
      expect(res.status).toBe(503)
      expect(purge).not.toHaveBeenCalled()
      expect(cache.version("courses")).toBe(0)
    })
  })

  it("does not report success when the shared bump fails", async () => {
    const { redis } = createFakeRedis()
    redis.multi = vi.fn(() => {
      throw new Error("redis down")
    }) as any
    const cache = createCatalogCache(60_000, { redis: redis as any })
    const purge = vi.fn<Purge>().mockResolvedValue(undefined)

    await withServer(appFor(cache, purge), async (base) => {
      const res = await purgeRequest(base, { catalogs: ["courses"] })
      expect(res.status).toBe(503)
      expect(await res.json()).toEqual({ error: "Catalog version store unavailable" })
      expect(cache.version("courses")).toBe(0)
    })
  })
})
