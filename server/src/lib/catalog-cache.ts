import { createHash } from "node:crypto"
import { performance } from "node:perf_hooks"
import type { RequestHandler } from "express"
import { LRUCache } from "lru-cache"

import type { CachePolicy } from "./cache.js"
import { MAX_PAGE_SIZE } from "./pagination.js"
import { getRedisClient, type RedisLike } from "./redis.js"
import { serverTimingHeader } from "./timing.js"

/** Short enough that a direct DB edit cannot be hidden for a day. */
export const CATALOG_CACHE_POLICY: CachePolicy = { browser: 60, cdn: 120, swr: 120 }
export const CATALOG_TTL_MS = 60_000
export const CATALOG_CACHE_MAX_ENTRIES = 500
export const CATALOG_VERSION_REFRESH_MS = 1_000

export const CATALOG_NAMES = ["courses", "notes", "models"] as const
export type CatalogName = (typeof CATALOG_NAMES)[number]

export function catalogVersionKey(catalog: CatalogName): string {
  return `catalog:version:${catalog}`
}

interface CacheEntry {
  body: unknown
  /** Serialized once on fill so a cache hit does not stringify the body again. */
  serialized: string
  etag: string
}

export interface CatalogCacheOptions {
  catalog: CatalogName
  policy: CachePolicy
  /** Only these params join the key; everything else is ignored. */
  allowedParams?: readonly string[]
}

export interface CatalogCacheFactoryOptions {
  /** Injected for tests; production uses the lazy Upstash client. */
  redis?: RedisLike
  env?: NodeJS.ProcessEnv
  versionTtlMs?: number
}

export interface CatalogCache {
  middleware(options: CatalogCacheOptions): RequestHandler
  /** Locally cached version; a read may refresh it from Redis first. */
  version(catalog: CatalogName): number
  refreshVersion(catalog: CatalogName): Promise<number>
  /** Local-only bump kept for unit tests and single-process callers. */
  bump(catalogs: CatalogName | readonly CatalogName[]): number[]
  /** Atomic shared bump used by the purge route. */
  bumpShared(catalogs: CatalogName | readonly CatalogName[]): Promise<number[]>
  versionStoreReady(): boolean
  clear(): void
}

export function catalogCacheTag(catalog: CatalogName): string {
  return `catalog-${catalog}`
}

function policyHeader(policy: CachePolicy): string {
  return [
    "public",
    policy.cdn ? `s-maxage=${policy.cdn}` : undefined,
    policy.browser ? `max-age=${policy.browser}` : undefined,
    policy.swr ? `stale-while-revalidate=${policy.swr}` : undefined,
  ]
    .filter((directive): directive is string => Boolean(directive))
    .join(", ")
}

function etagForSerialized(serialized: string): string {
  return `W/"${createHash("sha1").update(serialized).digest("base64url")}"`
}

/**
 * Sorted, bounded and normalized so that `?x=1` and `?x=2` cannot mint entries,
 * and `?limit=01` is the same page as `?limit=1`. Values are still validated by
 * the route (limit/cursor via parsePageRequest) before anything is stored.
 */
function normalizeParams(
  query: Record<string, unknown>,
  allowedParams: readonly string[],
): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  for (const name of allowedParams) {
    const raw = query[name]
    if (typeof raw !== "string" || raw.length === 0 || raw.length > 256) continue
    const value = name === "limit" && /^\d+$/.test(raw)
      ? String(Math.min(Number(raw), MAX_PAGE_SIZE))
      : raw
    pairs.push([name, value])
  }
  return pairs.sort(([a], [b]) => a.localeCompare(b))
}

function requestPath(req: { baseUrl?: string; path?: string }): string {
  return `${req.baseUrl ?? ""}${req.path ?? "/"}`.replace(/\/{2,}/g, "/") || "/"
}

function keyFor(
  catalog: CatalogName,
  version: number,
  req: { baseUrl?: string; path?: string; query: Record<string, unknown> },
  allowedParams: readonly string[],
): string {
  return `${catalog}:v${version}:${requestPath(req)}:${JSON.stringify(normalizeParams(req.query, allowedParams))}`
}

/**
 * Per-process response cache for public catalog reads.
 *
 * The version prefix makes invalidation O(1): bumping a catalog counter makes
 * every cursor and filter variant unreachable at once. The counter lives in
 * Redis when configured, so a purge reaches every API instance; each process
 * keeps a short-lived local copy to keep the read path free of Redis calls.
 */
export function createCatalogCache(
  ttlMs = CATALOG_TTL_MS,
  options: CatalogCacheFactoryOptions = {},
): CatalogCache {
  const versionTtlMs = options.versionTtlMs ?? CATALOG_VERSION_REFRESH_MS
  const store = new LRUCache<string, CacheEntry>({
    max: CATALOG_CACHE_MAX_ENTRIES,
    ttl: ttlMs,
  })
  const versions = new Map<CatalogName, number>(CATALOG_NAMES.map((name) => [name, 0]))
  const versionCheckedAt = new Map<CatalogName, number>()
  const versionFlights = new Map<CatalogName, Promise<number>>()
  const inFlight = new Map<string, Promise<CacheEntry | null>>()
  let versionStore = options.redis

  const resolveVersionStore = (): RedisLike | undefined => {
    if (versionStore) return versionStore
    try {
      versionStore = getRedisClient(options.env ?? process.env, "catalog version")
    } catch {
      // Public reads keep working with the last local version.
      return undefined
    }
    return versionStore
  }

  const refreshVersion = async (catalog: CatalogName): Promise<number> => {
    const checkedAt = versionCheckedAt.get(catalog) ?? 0
    if (Date.now() - checkedAt < versionTtlMs) return versions.get(catalog) ?? 0

    const pending = versionFlights.get(catalog)
    if (pending) return pending

    const flight = (async () => {
      const redisStore = resolveVersionStore()
      if (redisStore) {
        try {
          const raw = await redisStore.get(catalogVersionKey(catalog))
          const parsed = raw === null ? 0 : Number(raw)
          if (Number.isSafeInteger(parsed) && parsed >= 0) versions.set(catalog, parsed)
        } catch {
          // Keep the last known version; a public read must not fail on Redis.
        }
      }
      versionCheckedAt.set(catalog, Date.now())
      versionFlights.delete(catalog)
      return versions.get(catalog) ?? 0
    })()
    versionFlights.set(catalog, flight)
    return flight
  }

  const clearCatalogEntries = (names: readonly CatalogName[]): void => {
    for (const key of store.keys()) {
      if (names.some((name) => key.startsWith(`${name}:`))) store.delete(key)
    }
  }

  const bump = (catalogs: CatalogName | readonly CatalogName[]): number[] => {
    const names = Array.isArray(catalogs) ? catalogs : [catalogs]
    for (const name of names) {
      versions.set(name, (versions.get(name) ?? 0) + 1)
      versionCheckedAt.set(name, Date.now())
    }
    clearCatalogEntries(names)
    return names.map((name) => versions.get(name) ?? 0)
  }

  const bumpShared = async (
    catalogs: CatalogName | readonly CatalogName[],
  ): Promise<number[]> => {
    const names = Array.isArray(catalogs) ? catalogs : [catalogs]
    const redisStore = resolveVersionStore()
    if (!redisStore) throw new Error("Catalog version store is not configured")

    let chain = redisStore.multi()
    for (const name of names) chain = chain.incr(catalogVersionKey(name))
    const values = await chain.exec()

    names.forEach((name, index) => {
      const parsed = Number(values[index])
      if (Number.isSafeInteger(parsed) && parsed >= 0) versions.set(name, parsed)
      versionCheckedAt.set(name, Date.now())
    })
    clearCatalogEntries(names)
    return names.map((name) => versions.get(name) ?? 0)
  }

  const send = (
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    entry: CacheEntry,
    catalog: CatalogName,
    header: string,
    lookupMs: number,
    loadMs?: number,
  ): void => {
    res.setHeader("Server-Timing", serverTimingHeader(lookupMs, loadMs))
    res.setHeader("Cache-Control", header)
    res.setHeader("ETag", entry.etag)
    res.setHeader("Vercel-Cache-Tag", catalogCacheTag(catalog))
    if (req.headers["if-none-match"] === entry.etag) {
      res.status(304)
      res.end()
      return
    }
    res.status(200).type("application/json").send(entry.serialized)
  }

  return {
    middleware({ catalog, policy, allowedParams = [] }: CatalogCacheOptions): RequestHandler {
      const header = policyHeader(policy)

      return async (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next()

        await refreshVersion(catalog)
        const lookupStartedAt = performance.now()
        const version = versions.get(catalog) ?? 0
        const key = keyFor(catalog, version, req, allowedParams)
        const hit = store.get(key)
        const lookupMs = performance.now() - lookupStartedAt
        if (hit) {
          send(req, res, hit, catalog, header, lookupMs)
          return
        }

        // A single miss loads the database; concurrent readers wait for that
        // one result instead of stampeding the same uncached key. If a purge
        // lands while they wait, they fall through and load the new version.
        const pending = inFlight.get(key)
        if (pending) {
          const waitStartedAt = performance.now()
          void pending.then(
            (entry) => {
              if (!entry || versions.get(catalog) !== version) {
                next()
                return
              }
              try {
                send(req, res, entry, catalog, header, lookupMs, performance.now() - waitStartedAt)
              } catch {
                if (!res.headersSent) next()
              }
            },
            () => next(),
          )
          return
        }

        let resolveFlight!: (entry: CacheEntry | null) => void
        const flight = new Promise<CacheEntry | null>((resolve) => {
          resolveFlight = resolve
        })
        inFlight.set(key, flight)

        let settled = false
        const settle = (entry: CacheEntry | null): void => {
          if (settled) return
          settled = true
          resolveFlight(entry)
          if (inFlight.get(key) === flight) inFlight.delete(key)
        }
        res.once("close", () => settle(null))
        res.once("finish", () => settle(null))

        const loadStartedAt = performance.now()
        const json = res.json.bind(res)
        res.json = ((body: unknown) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const serialized = JSON.stringify(body)
            const entry = { body, serialized, etag: etagForSerialized(serialized) }
            // Never store a response that started before a version bump.
            if (versions.get(catalog) === version) store.set(key, entry)
            res.setHeader("Server-Timing", serverTimingHeader(lookupMs, performance.now() - loadStartedAt))
            res.setHeader("Cache-Control", header)
            res.setHeader("ETag", entry.etag)
            res.setHeader("Vercel-Cache-Tag", catalogCacheTag(catalog))
            settle(entry)
            if (req.headers["if-none-match"] === entry.etag) {
              res.status(304)
              return res.end()
            }
            res.status(200).type("application/json").send(serialized)
            return res
          }
          settle(null)
          return json(body)
        }) as typeof res.json

        next()
      }
    },

    version(catalog: CatalogName): number {
      return versions.get(catalog) ?? 0
    },

    refreshVersion,

    bump,

    bumpShared,

    versionStoreReady(): boolean {
      return Boolean(resolveVersionStore())
    },

    clear(): void {
      store.clear()
      inFlight.clear()
      versionFlights.clear()
      versionCheckedAt.clear()
    },
  }
}

export const catalogCache = createCatalogCache()
