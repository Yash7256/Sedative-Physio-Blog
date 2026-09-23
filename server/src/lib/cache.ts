import { createHash } from "node:crypto"
import type { RequestHandler } from "express"

export interface CachePolicy {
  /** Browser freshness in seconds (max-age). */
  browser?: number
  /** CDN/edge freshness in seconds (s-maxage). */
  cdn?: number
  /** How long stale responses may be served while revalidating (seconds). */
  swr?: number
}

/**
 * Edge/browser caching for public, idempotent GET endpoints.
 *
 * - Sets Cache-Control only on 2xx JSON responses (errors stay uncached).
 * - Attaches a content-hash ETag and answers If-None-Match with a body-less
 *   304, so repeat visits skip the DB/service entirely.
 * - Requires `app.set("etag", false)` in app.ts so Express's own ETag doesn't
 *   collide with the one we generate here.
 */
export function cacheControl(policy: CachePolicy): RequestHandler {
  return (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next()

    const value = [
      "public",
      policy.cdn ? `s-maxage=${policy.cdn}` : undefined,
      policy.browser ? `max-age=${policy.browser}` : undefined,
      policy.swr ? `stale-while-revalidate=${policy.swr}` : undefined,
    ]
      .filter((d): d is string => Boolean(d))
      .join(", ")

    const json = res.json.bind(res)
    res.json = ((body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const etag = `W/"${createHash("sha1").update(JSON.stringify(body)).digest("base64url")}"`
        res.setHeader("Cache-Control", value)
        res.setHeader("ETag", etag)
        if (req.headers["if-none-match"] === etag) {
          res.status(304)
          return res.end()
        }
      }
      return json(body)
    }) as typeof res.json

    next()
  }
}

const etagDigest = (input: string): string =>
  createHash("sha256").update(input).digest("hex").slice(0, 24)

/** Stable ETag for a streamed object that maps 1:1 to a storage key. */
export function fileEtag(key: string, size: number | null | undefined): string {
  return `W/"${etagDigest(`${key}:${size ?? 0}`)}"`
}