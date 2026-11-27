import type { NextFunction, Request, RequestHandler } from "express"
import rateLimit, { ipKeyGenerator, type Options, type Store } from "express-rate-limit"

import { getRedisClient, type RedisLike } from "./redis.js"

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
      activeStore = new UpstashStore(prefix, windowMs, getRedisClient(env, "rate-limit"))
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
    // express-rate-limit converts its own store errors into next(error). A
    // callback that ignores that argument would silently continue the request,
    // so the fail-closed response has to be produced from this next handler.
    const failClosedNext: NextFunction = (err) => {
      if (err) {
        if (!res.headersSent) {
          res.status(503).json({ error: "Service temporarily unavailable" })
        }
        return
      }
      next()
    }

    Promise.resolve(middleware(req, res, failClosedNext)).catch(failClosedNext)
  }
}

/**
 * Shared limiter for every anonymous catalog list. ipKeyGenerator halves IPv6
 * addresses so one household cannot escape the limit by rotating interface
 * identifiers within its assigned /64 — and it silences the library's IPv6
 * key-generator validation warning.
 */
export function catalogIpKey(req: Request): string {
  return `catalog:${ipKeyGenerator(req.ip ?? "unknown")}`
}

export const catalogListLimiter = createLimiter({
  prefix: "catalog-list",
  windowMs: 60 * 1000,
  limit: 300,
  keyGenerator: catalogIpKey,
  message: { error: "Too many catalog requests. Please try again later." },
})
