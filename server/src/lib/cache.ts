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
 * The default for every response that has not explicitly opted in to caching.
 *
 * `no-store` is the directive that matters (RFC 9111 §5.2.2.5: an intermediary
 * must not store the response at all). `private` is redundant against a
 * compliant cache but is kept deliberately — some CDNs mishandle `no-store`
 * while still honouring `private`, and a second, independent barrier is cheap
 * on the handful of responses that carry per-user data.
 */
export const NO_STORE = "no-store, private"

/**
 * Marks a response uncacheable by browsers and by every shared cache.
 *
 * Mounted globally in `app.ts` so that *denying* caching is the default and
 * *allowing* it is the explicit act. That inversion matters: the endpoints
 * that must never be cached are the ones nobody thinks about when adding a
 * route. `GET /api/auth/me` returns one user's identity and
 * `GET /api/payments/my-enrollments` returns one user's enrollments — the
 * latter is optional-auth, so it answers `[]` for a stranger and a populated
 * list for the owner, from the same URL. Relying on the absence of a `public`
 * directive to keep those out of a CDN is a bet on every layer behaving.
 *
 * A route opts back in by calling `res.setHeader("Cache-Control", …)` (or using
 * `cacheControl`), which replaces this value. Order matters: the header has to
 * be set before an early `res.end()`, or a 304 revalidation ships carrying
 * `no-store` and the client discards the very entry it just revalidated.
 */
export function noStore(): RequestHandler {
  return (_req, res, next) => {
    res.setHeader("Cache-Control", NO_STORE)
    next()
  }
}

/**
 * Edge/browser caching for public, idempotent GET endpoints. Opt-in; see
 * `noStore` for the default it overrides.
 *
 * - Sets Cache-Control only on 2xx JSON responses, so a public route's error
 *   responses still inherit `no-store` rather than becoming cacheable.
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
        // Set before the 304 return: a 304 refreshes the headers of an
        // already-stored entry, so it must carry this route's policy rather
        // than the `no-store` default. Scoped to 2xx so an error response still
        // inherits `no-store` and never becomes cacheable.
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