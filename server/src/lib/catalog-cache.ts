import { createHash } from "node:crypto"
import type { RequestHandler } from "express"
import { LRUCache } from "lru-cache"

import type { CachePolicy } from "./cache.js"
import { MAX_PAGE_SIZE } from "./pagination.js"

/** Short enough that a direct DB edit cannot be hidden for a day. */
export const CATALOG_CACHE_POLICY: CachePolicy = { browser: 60, cdn: 120, swr: 120 }
export const CATALOG_TTL_MS = 60_000
export const CATALOG_CACHE_MAX_ENTRIES = 500

export const CATALOG_NAMES = ["courses", "notes", "models"] as const
export type CatalogName = (typeof CATALOG_NAMES)[number]

interface CacheEntry {
  body: unknown
  etag: string
}

export interface CatalogCacheOptions {
  catalog: CatalogName
  policy: CachePolicy
  /** Only these params join the key; everything else is ignored. */
  allowedParams?: readonly string[]
}

export interface CatalogCache {
  middleware(options: CatalogCacheOptions): RequestHandler
  version(catalog: CatalogName): number
  /** Invalidates every cursor/filter variant of a catalog in one step. */
  bump(catalogs: CatalogName | readonly CatalogName[]): number[]
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

function etagFor(body: unknown): string {
  return `W/"${createHash("sha1").update(JSON.stringify(body)).digest("base64url")}"`
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
 * every cursor and filter variant unreachable at once. With more than one API
 * instance the version belongs in Redis (already a dependency here); until
 * then this in-memory instance is the single source of truth.
 */
export function createCatalogCache(ttlMs = CATALOG_TTL_MS): CatalogCache {
  const store = new LRUCache<string, CacheEntry>({
    max: CATALOG_CACHE_MAX_ENTRIES,
    ttl: ttlMs,
  })
  const versions = new Map<CatalogName, number>(CATALOG_NAMES.map((name) => [name, 0]))
  const inFlight = new Map<string, Promise<CacheEntry | null>>()

  const bump = (catalogs: CatalogName | readonly CatalogName[]): number[] => {
    const names = Array.isArray(catalogs) ? catalogs : [catalogs]
    for (const name of names) {
      versions.set(name, (versions.get(name) ?? 0) + 1)
    }
    for (const key of store.keys()) {
      if (names.some((name) => key.startsWith(`${name}:`))) store.delete(key)
    }
    return names.map((name) => versions.get(name) ?? 0)
  }

  const send = (
    req: Parameters<RequestHandler>[0],
    res: Parameters<RequestHandler>[1],
    entry: CacheEntry,
    catalog: CatalogName,
    header: string,
  ): void => {
    res.setHeader("Cache-Control", header)
    res.setHeader("ETag", entry.etag)
    res.setHeader("Vercel-Cache-Tag", catalogCacheTag(catalog))
    if (req.headers["if-none-match"] === entry.etag) {
      res.status(304)
      res.end()
      return
    }
    res.status(200).json(entry.body)
  }

  return {
    middleware({ catalog, policy, allowedParams = [] }: CatalogCacheOptions): RequestHandler {
      const header = policyHeader(policy)

      return (req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next()

        const version = versions.get(catalog) ?? 0
        const key = keyFor(catalog, version, req, allowedParams)
        const hit = store.get(key)
        if (hit) {
          send(req, res, hit, catalog, header)
          return
        }

        // A single miss loads the database; concurrent readers wait for that
        // one result instead of stampeding the same uncached key. If a purge
        // lands while they wait, they fall through and load the new version.
        const pending = inFlight.get(key)
        if (pending) {
          void pending.then(
            (entry) => {
              if (!entry || versions.get(catalog) !== version) {
                next()
                return
              }
              try {
                send(req, res, entry, catalog, header)
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

        const json = res.json.bind(res)
        res.json = ((body: unknown) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const entry = { body, etag: etagFor(body) }
            // Never store a response that started before a version bump.
            if (versions.get(catalog) === version) store.set(key, entry)
            res.setHeader("Cache-Control", header)
            res.setHeader("ETag", entry.etag)
            res.setHeader("Vercel-Cache-Tag", catalogCacheTag(catalog))
            settle(entry)
            if (req.headers["if-none-match"] === entry.etag) {
              res.status(304)
              return res.end()
            }
          } else {
            settle(null)
          }
          return json(body)
        }) as typeof res.json

        next()
      }
    },

    version(catalog: CatalogName): number {
      return versions.get(catalog) ?? 0
    },

    bump,

    clear(): void {
      store.clear()
      inFlight.clear()
    },
  }
}

export const catalogCache = createCatalogCache()
