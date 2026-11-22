import { Redis } from "@upstash/redis"
import type { RequestHandler } from "express"
import rateLimit, { type Options, type Store } from "express-rate-limit"

/** The subset of the Upstash client the store actually uses. */
interface RedisLike {
  multi(): {
    incr(key: string): { pttl(key: string): { exec(): Promise<unknown> } }
  }
  pexpire(key: string, ms: number): Promise<unknown>
  decr(key: string): Promise<unknown>
  del(key: string): Promise<unknown>
}

let redisClient: RedisLike | undefined

function getRedisClient(env: NodeJS.ProcessEnv): RedisLike {
  if (redisClient) return redisClient

  const url = env.UPSTASH_REDIS_REST_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    console.error("[rate-limit] Shared rate-limit store credentials are missing")
    throw new Error("Shared rate-limit store is not configured.")
  }

  redisClient = new Redis({ url, token }) as unknown as RedisLike
  return redisClient
}

/**
 * A shared, atomic fixed-window counter for express-rate-limit v8.
 *
 * The counter and its expiry are created in one MULTI. If the expiry is ever
 * missing we repair it instead of leaving a key that counts forever.
 */
export class UpstashStore implements Store {
  readonly localKeys = false
  readonly prefix: string

  constructor(
    prefix: string,
    private readonly windowMs: number,
    private readonly redis: RedisLike,
  ) {
    this.prefix = prefix
  }

  init(): void {
    // Upstash needs no per-limiter setup; the client is a lazy singleton.
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const redisKey = `${this.prefix}:${key}`
    const result = (await this.redis.multi().incr(redisKey).pttl(redisKey).exec()) as unknown[]
    const totalHits = Number(result[0])
    const ttl = Number(result[1])

    if (ttl < 0) {
      await this.redis.pexpire(redisKey, this.windowMs)
    }

    return { totalHits, resetTime: new Date(Date.now() + this.windowMs) }
  }

  async decrement(key: string): Promise<void> {
    await this.redis.decr(`${this.prefix}:${key}`)
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}:${key}`)
  }
}

export interface CreateLimiterOptions {
  prefix: string
  windowMs: number
  limit: number
  keyGenerator?: Options["keyGenerator"]
  failClosed?: boolean
  store?: Store
  env?: NodeJS.ProcessEnv
  message?: Options["message"]
  validate?: Options["validate"]
}

/**
 * The only place direct rate-limit middleware is constructed.
 *
 * Public routes pass on a store outage (the alternative is a self-inflicted
 * outage); sensitive routes opt into `failClosed` and get a plain 503 with no
 * stack or store detail in the response.
 */
export function createLimiter({
  prefix,
  windowMs,
  limit,
  keyGenerator,
  failClosed = false,
  store,
  env = process.env,
  message = { error: "Too many requests, please try again later." },
  validate,
}: CreateLimiterOptions): RequestHandler {
  let activeStore = store

  if (!activeStore && env.NODE_ENV === "production") {
    if (env.RATE_LIMIT_ALLOW_MEMORY === "1") {
      console.warn("[rate-limit] Using per-instance memory limits")
    } else {
      activeStore = new UpstashStore(prefix, windowMs, getRedisClient(env))
    }
  }

  const middleware = rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    store: activeStore,
    passOnStoreError: !failClosed,
    keyGenerator,
    message,
    validate,
  })

  if (!failClosed) return middleware

  return (req, res, next) => {
    Promise.resolve(middleware(req, res, () => next())).catch(() => {
      if (res.headersSent) return
      res.status(503).json({ error: "Service temporarily unavailable" })
    })
  }
}
