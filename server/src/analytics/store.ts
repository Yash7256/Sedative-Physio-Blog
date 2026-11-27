import { getRedisClient, type RedisLike } from "../lib/redis.js"
import type { AnalyticsEvent, AnalyticsEventPayload } from "./payload.js"

const ANALYTICS_PREFIX = "analytics"
const ANALYTICS_TTL_MS = 7 * 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

export interface AnalyticsStore {
  record(event: AnalyticsEvent, payload: AnalyticsEventPayload, nowMs?: number): Promise<void>
}

async function incrementWithTtl(redis: RedisLike, key: string, amount: number): Promise<void> {
  const multi = redis.multi()
  multi.incrby(key, amount)
  multi.pttl(key)
  const result = await multi.exec() as unknown[]
  const totalHits = Number(result[0])
  const ttl = Number(result[1])

  if (!Number.isFinite(totalHits)) return
  if (ttl < 0) await redis.pexpire(key, ANALYTICS_TTL_MS)
}

/**
 * Bounded keys only: event + two low-cardinality dimensions + hour. Numeric
 * fields go into sum keys rather than into the key space, so a caller cannot
 * mint unbounded entries with clever payloads.
 */
export function createAnalyticsStore(
  redis: RedisLike,
  prefix = ANALYTICS_PREFIX,
): AnalyticsStore {
  return {
    async record(event, payload, nowMs = Date.now()) {
      const hour = new Date(Math.floor(nowMs / HOUR_MS) * HOUR_MS).toISOString()
      const scope = [event, payload.filter ?? "all", payload.statusBucket ?? "ok", hour].join(":")
      const base = `${prefix}:${scope}`

      await incrementWithTtl(redis, `${base}:events`, 1)
      if (payload.count !== undefined) await incrementWithTtl(redis, `${base}:cards`, payload.count)
      if (payload.durationMs !== undefined) await incrementWithTtl(redis, `${base}:duration-ms`, payload.durationMs)
    },
  }
}

/** Telemetry is best-effort: a missing store disables recording, not the page. */
export function resolveAnalyticsStore(env: NodeJS.ProcessEnv = process.env): AnalyticsStore | null {
  try {
    return createAnalyticsStore(getRedisClient(env, "analytics"))
  } catch {
    return null
  }
}
