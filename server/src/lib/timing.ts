import type { RequestHandler } from "express"

const formatMs = (ms: number): string => ms.toFixed(3)

/**
 * Server-Timing for catalog reads. The `cache` segment is always present so a
 * hit and a miss can be compared from the response alone; `version` and `load`
 * exist only when that work actually happened. Only durations are emitted, so
 * no key, origin or user data can leak into the header.
 */
export function serverTimingHeader(
  lookupMs: number,
  loadMs?: number,
  versionMs?: number,
): string {
  const segments: string[] = []
  if (versionMs !== undefined) {
    segments.push(`version;dur=${formatMs(versionMs)};desc="catalog version"`)
  }
  segments.push(`cache;dur=${formatMs(lookupMs)};desc="catalog lookup"`)
  if (loadMs !== undefined) {
    segments.push(`load;dur=${formatMs(loadMs)};desc="catalog load"`)
  }
  return segments.join(", ")
}

/**
 * Browser DevTools zeroes cross-origin timing fields unless the origin is
 * allowed here. Echo only configured origins; never the request's Origin header
 * and never `*`, because catalog requests can carry Clerk cookies.
 */
export function timingAllowOrigin(origins: readonly string[]): RequestHandler {
  const value = origins.join(", ")
  return (_req, res, next) => {
    if (value) res.setHeader("Timing-Allow-Origin", value)
    next()
  }
}
