import express from "express"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createCatalogCache, type CatalogName } from "../../lib/catalog-cache.js"
import { anonymous, asUser, fakeAuth, withServer, type FakeSession } from "../../test/harness.js"
import { createCacheRouter, purgeVercelCache } from "../router.js"

type Purge = (catalogs: readonly CatalogName[]) => Promise<void>

function purgeMock() {
  return vi.fn<Purge>().mockResolvedValue(undefined)
}

function appFor(session: FakeSession, cache: ReturnType<typeof createCatalogCache>, purge: Purge) {
  const app = express()
  app.use(express.json())
  fakeAuth(app, session)
  app.use("/cache", createCacheRouter({ cache, purge }))
  return app
}

beforeEach(() => {
  process.env.CACHE_ADMIN_USER_IDS = "user_admin, user_admin_two"
})

afterEach(() => {
  delete process.env.CACHE_ADMIN_USER_IDS
})

describe("POST /cache/purge", () => {
  it("rejects an anonymous caller", async () => {
    const cache = createCatalogCache()
    const purge = purgeMock()

    await withServer(appFor(anonymous, cache, purge), async (base) => {
      const res = await fetch(`${base}/cache/purge`, { method: "POST" })
      expect(res.status).toBe(401)
      expect(purge).not.toHaveBeenCalled()
      expect(cache.version("courses")).toBe(0)
    })
  })

  it("rejects a signed-in caller outside the admin allowlist", async () => {
    const cache = createCatalogCache()
    const purge = purgeMock()

    await withServer(appFor(asUser("user_student"), cache, purge), async (base) => {
      const res = await fetch(`${base}/cache/purge`, { method: "POST" })
      expect(res.status).toBe(403)
      expect(purge).not.toHaveBeenCalled()
    })
  })

  it("fails closed when the admin allowlist is missing", async () => {
    delete process.env.CACHE_ADMIN_USER_IDS
    const cache = createCatalogCache()
    const purge = purgeMock()

    await withServer(appFor(asUser("user_admin"), cache, purge), async (base) => {
      const res = await fetch(`${base}/cache/purge`, { method: "POST" })
      expect(res.status).toBe(403)
      expect(purge).not.toHaveBeenCalled()
    })
  })

  it("purges the CDN then bumps every catalog version for an admin", async () => {
    const cache = createCatalogCache()
    const purge = purgeMock()

    await withServer(appFor(asUser("user_admin"), cache, purge), async (base) => {
      const res = await fetch(`${base}/cache/purge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ catalogs: ["courses", "notes"] }),
      })

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ purged: ["courses", "notes"], cdn: "purged" })
      expect(purge).toHaveBeenCalledWith(["courses", "notes"])
      expect(cache.version("courses")).toBe(1)
      expect(cache.version("notes")).toBe(1)
      expect(cache.version("models")).toBe(0)
    })
  })

  it("defaults to all catalogs and refuses unknown names", async () => {
    const cache = createCatalogCache()
    const purge = purgeMock()

    await withServer(appFor(asUser("user_admin_two"), cache, purge), async (base) => {
      const all = await fetch(`${base}/cache/purge`, { method: "POST" })
      expect(all.status).toBe(200)
      expect(purge).toHaveBeenCalledWith(["courses", "notes", "models"])

      const bad = await fetch(`${base}/cache/purge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ catalogs: ["courses", "unknown"] }),
      })
      expect(bad.status).toBe(400)
      expect(purge).toHaveBeenCalledTimes(1)
    })
  })

  it("does not bump versions when the CDN purge fails", async () => {
    const cache = createCatalogCache()
    const purge = purgeMock().mockRejectedValue(new Error("CDN unavailable"))

    await withServer(appFor(asUser("user_admin"), cache, purge), async (base) => {
      const res = await fetch(`${base}/cache/purge`, { method: "POST" })
      expect(res.status).toBe(502)
      expect(cache.version("courses")).toBe(0)
    })
  })
})

describe("purgeVercelCache", () => {
  it("invalidates the catalog tags through the Vercel REST API", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 })

    await purgeVercelCache(
      ["courses", "notes"],
      {
        VERCEL_ACCESS_TOKEN: "fake-token",
        VERCEL_PROJECT_ID: "fake-project",
        VERCEL_TEAM_ID: "fake-team",
      },
      fetchImpl as unknown as typeof fetch,
    )

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe(
      "https://api.vercel.com/v1/edge-cache/invalidate-by-tags?projectIdOrName=fake-project&teamId=fake-team",
    )
    expect(init.method).toBe("POST")
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer fake-token")
    expect(JSON.parse(String(init.body))).toEqual({
      tags: ["catalog-courses", "catalog-notes"],
      target: "production",
    })
  })

  it("fails closed without credentials", async () => {
    const fetchImpl = vi.fn()

    await expect(
      purgeVercelCache(["courses"], {}, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow("CDN purge is not configured")
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("reports a failed purge without echoing the response body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "secret detail" })

    await expect(
      purgeVercelCache(
        ["courses"],
        { VERCEL_TOKEN: "fake-token", VERCEL_PROJECT_ID: "fake-project" },
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow("CDN purge failed (403)")
  })
})
