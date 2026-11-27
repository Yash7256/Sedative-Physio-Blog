import express from "express"
import { describe, expect, it, vi } from "vitest"

import { noStore } from "../cache.js"
import {
  CATALOG_CACHE_POLICY,
  createCatalogCache,
  type CatalogName,
} from "../catalog-cache.js"
import { withServer } from "../../test/harness.js"

const CATALOG_HEADER = "public, s-maxage=120, max-age=60, stale-while-revalidate=120"

function buildApp(
  cache: ReturnType<typeof createCatalogCache>,
  catalog: CatalogName,
  loader: () => Promise<unknown>,
  allowedParams: readonly string[] = ["limit", "cursor"],
) {
  const app = express()
  app.set("etag", false)
  app.use(noStore())
  app.get(`/api/${catalog}`, cache.middleware({ catalog, policy: CATALOG_CACHE_POLICY, allowedParams }), async (_req, res) => {
    res.json(await loader())
  })
  return app
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function segments(header: string | null): string[] {
  return (header ?? "").split(",").map((part) => part.trim().split(";")[0] ?? "")
}

describe("catalog response cache", () => {
  it("serves a hit from memory and keeps the short revalidation window", async () => {
    const loader = vi.fn(async () => ({ items: [{ id: "c1" }], nextCursor: null }))
    const cache = createCatalogCache()
    const app = buildApp(cache, "courses", loader)

    await withServer(app, async (base) => {
      const first = await fetch(`${base}/api/courses?limit=12`)
      expect(first.status).toBe(200)
      expect(first.headers.get("cache-control")).toBe(CATALOG_HEADER)
      expect(first.headers.get("vercel-cache-tag")).toBe("catalog-courses")
      expect(first.headers.get("etag")).toMatch(/^W\//)

      const second = await fetch(`${base}/api/courses?limit=12`)
      expect(await second.json()).toEqual({ items: [{ id: "c1" }], nextCursor: null })
      expect(loader).toHaveBeenCalledTimes(1)
    })
  })

  it("ignores unwhitelisted query params instead of creating new entries", async () => {
    const loader = vi.fn(async () => ({ items: [], nextCursor: null }))
    const cache = createCatalogCache()
    const app = buildApp(cache, "courses", loader)

    await withServer(app, async (base) => {
      await fetch(`${base}/api/courses?limit=12&utm_source=one`)
      await fetch(`${base}/api/courses?utm_source=two&limit=12`)
      expect(loader).toHaveBeenCalledTimes(1)
    })
  })

  it("separates whitelisted variants even when their order differs", async () => {
    const loader = vi.fn(async () => ({ items: [], nextCursor: null }))
    const cache = createCatalogCache()
    const app = buildApp(cache, "notes", loader, ["category", "limit", "cursor"])

    await withServer(app, async (base) => {
      await fetch(`${base}/api/notes?limit=12&category=notes`)
      await fetch(`${base}/api/notes?category=notes&limit=12`)
      expect(loader).toHaveBeenCalledTimes(1)

      await fetch(`${base}/api/notes?category=other&limit=12`)
      expect(loader).toHaveBeenCalledTimes(2)
    })
  })

  it("answers a matching If-None-Match with a 304 without querying again", async () => {
    const loader = vi.fn(async () => ({ items: [{ id: "c1" }], nextCursor: null }))
    const cache = createCatalogCache()
    const app = buildApp(cache, "courses", loader)

    await withServer(app, async (base) => {
      const first = await fetch(`${base}/api/courses`)
      const etag = first.headers.get("etag")!
      const second = await fetch(`${base}/api/courses`, { headers: { "If-None-Match": etag } })

      expect(second.status).toBe(304)
      expect(await second.text()).toBe("")
      expect(second.headers.get("cache-control")).toBe(CATALOG_HEADER)
      expect(second.headers.get("etag")).toBe(etag)
      expect(loader).toHaveBeenCalledTimes(1)
    })
  })

  it("collapses concurrent misses into one load", async () => {
    const loader = vi.fn(async () => {
      await delay(25)
      return { items: [{ id: "c1" }], nextCursor: null }
    })
    const cache = createCatalogCache()
    const app = buildApp(cache, "courses", loader)

    await withServer(app, async (base) => {
      const responses = await Promise.all(
        Array.from({ length: 10 }, () => fetch(`${base}/api/courses?limit=12`)),
      )

      expect(loader).toHaveBeenCalledTimes(1)
      expect(responses.every((res) => res.status === 200)).toBe(true)
      const bodies = await Promise.all(
        responses.map((res) => res.json() as Promise<{ items: Array<{ id: string }> }>),
      )
      expect(bodies.every((body) => body.items[0]?.id === "c1")).toBe(true)
    })
  })

  it("keeps cache headers for an in-flight waiter when a version bump lands", async () => {
    let release!: () => void
    let first = true
    const body = { items: [{ id: "c1" }], nextCursor: null }
    const loader = vi.fn(async () => {
      if (first) {
        first = false
        await new Promise<void>((resolve) => {
          release = resolve
        })
      }
      return body
    })
    const cache = createCatalogCache()
    const app = buildApp(cache, "courses", loader)

    await withServer(app, async (base) => {
      const leader = fetch(`${base}/api/courses?limit=12`)
      await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1))

      const waiter = fetch(`${base}/api/courses?limit=12`)
      cache.bump("courses")
      release()

      const res = await waiter
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual(body)
      expect(res.headers.get("cache-control")).toBe(CATALOG_HEADER)
      expect(res.headers.get("etag")).toMatch(/^W\//)
      expect(res.headers.get("vercel-cache-tag")).toBe("catalog-courses")
      expect(segments(res.headers.get("server-timing"))).toEqual(["version", "cache", "load"])
      await leader
    })
  })

  it("expires entries after the TTL", async () => {
    const loader = vi.fn(async () => ({ items: [], nextCursor: null }))
    const cache = createCatalogCache(10)
    const app = buildApp(cache, "models", loader)

    await withServer(app, async (base) => {
      await fetch(`${base}/api/models`)
      await delay(25)
      await fetch(`${base}/api/models`)
      expect(loader).toHaveBeenCalledTimes(2)
    })
  })

  it("keeps an LRU pool per catalog so one catalog cannot evict another", async () => {
    const noteLoader = vi.fn(async () => ({ items: [], nextCursor: null }))
    const courseLoader = vi.fn(async () => ({ items: [{ id: "c1" }], nextCursor: null }))
    const cache = createCatalogCache(60_000, { maxEntriesPerCatalog: 1 })

    await withServer(buildApp(cache, "notes", noteLoader, ["category"]), async (base) => {
      await fetch(`${base}/api/notes?category=a`)
      await fetch(`${base}/api/notes?category=b`)
      await fetch(`${base}/api/notes?category=a`)
      expect(noteLoader).toHaveBeenCalledTimes(3)
    })

    await withServer(buildApp(cache, "courses", courseLoader), async (base) => {
      await fetch(`${base}/api/courses`)
      await fetch(`${base}/api/courses`)
      expect(courseLoader).toHaveBeenCalledTimes(1)
    })
  })

  it("makes every variant unreachable when a catalog version is bumped", async () => {
    const loader = vi.fn(async () => ({ items: [], nextCursor: null }))
    const cache = createCatalogCache()
    const app = buildApp(cache, "courses", loader, ["limit", "cursor"])

    await withServer(app, async (base) => {
      await fetch(`${base}/api/courses?limit=12`)
      await fetch(`${base}/api/courses?limit=5`)
      expect(loader).toHaveBeenCalledTimes(2)
      expect(cache.version("courses")).toBe(0)

      expect(cache.bump("courses")).toEqual([1])

      await fetch(`${base}/api/courses?limit=12`)
      await fetch(`${base}/api/courses?limit=5`)
      expect(loader).toHaveBeenCalledTimes(4)
    })
  })
})
