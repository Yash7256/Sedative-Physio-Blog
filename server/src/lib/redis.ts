import { Redis } from "@upstash/redis"

/** Fluent MULTI subset shared by the rate limiter and catalog versions. */
export interface RedisMulti {
  incr(key: string): RedisMulti
  pttl(key: string): RedisMulti
  exec(): Promise<unknown[]>
}

/** The Upstash subset used in Sedative Physio. */
export interface RedisLike {
  get(key: string): Promise<string | null>
  incr(key: string): Promise<number>
  multi(): RedisMulti
  pexpire(key: string, ms: number): Promise<unknown>
  decr(key: string): Promise<unknown>
  del(key: string): Promise<unknown>
}

let redisClient: RedisLike | undefined

/**
 * One lazy Upstash client per process. Callers pass a label so a missing-config
 * error names the feature without echoing any env value.
 */
export function getRedisClient(
  env: NodeJS.ProcessEnv = process.env,
  label = "shared",
): RedisLike {
  if (redisClient) return redisClient

  const url = env.UPSTASH_REDIS_REST_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error(`${label} store is not configured`)

  redisClient = new Redis({ url, token }) as unknown as RedisLike
  return redisClient
}
