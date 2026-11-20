import { describe, expect, it, vi } from "vitest"

function fakeRedis() {
  const store = new Map<string, { value: number; expireAt: number }>()
  const now = () => Date.now()
  const multi = () => {
    const ops: Array<() => unknown> = []
    const chain = {
      incr(k: string) {
        ops.push(() => {
          const cur = store.get(k)
          const active = cur && cur.expireAt > now() ? cur.value : 0
          const next = { value: active + 1, expireAt: cur && cur.expireAt > now() ? cur.expireAt : 0 }
          store.set(k, next)
          return next.value
        })
        return chain
      },
      pttl(k: string) {
        ops.push(() => {
          const cur = store.get(k)
          if (!cur) return -2
          const ttl = cur.expireAt - now()
          return ttl > 0 ? ttl : -1
        })
        return chain
      },
      async exec() {
        return ops.map((op) => op())
      },
    }
    return chain
  }
  return {
    store,
    redis: {
      multi,
      pexpire: vi.fn(async (k: string, ms: number) => {
        const cur = store.get(k)
        if (cur) cur.expireAt = now() + ms
      }),
      decr: vi.fn(async (k: string) => {
        const cur = store.get(k)
        if (cur) cur.value = Math.max(0, cur.value - 1)
      }),
      del: vi.fn(async (k: string) => {
        store.delete(k)
      }),
    },
  }
}

describe("rate-limit (F-08)", () => {
  it.fails("production without shared store throws unless override", async () => {
    // @ts-ignore - module created in P4
    const { createLimiter } = await import("../rate-limit.js")
    expect(() =>
      createLimiter({
        prefix: "t",
        windowMs: 1000,
        limit: 1,
        env: { NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv,
      }),
    ).toThrow()
  })

  it.fails("production allows memory store when RATE_LIMIT_ALLOW_MEMORY=1", async () => {
    // @ts-ignore - module created in P4
    const { createLimiter } = await import("../rate-limit.js")
    expect(() =>
      createLimiter({
        prefix: "t",
        windowMs: 1000,
        limit: 1,
        env: { NODE_ENV: "production", RATE_LIMIT_ALLOW_MEMORY: "1" } as unknown as NodeJS.ProcessEnv,
      }),
    ).not.toThrow()
  })

  it.fails("Upstash store increments and sets the window on first hit", async () => {
    // @ts-ignore - module created in P4
    const { UpstashStore } = await import("../rate-limit.js")
    const { redis } = fakeRedis()
    const store = new UpstashStore("p", 60_000, redis as any)
    const a = await store.increment("k")
    expect(a.totalHits).toBe(1)
    expect(redis.pexpire).toHaveBeenCalled()
  })

  it.fails("Upstash store repairs a missing expiry", async () => {
    // @ts-ignore - module created in P4
    const { UpstashStore } = await import("../rate-limit.js")
    const { redis, store: data } = fakeRedis()
    const store = new UpstashStore("p", 60_000, redis as any)
    data.set("p:k", { value: 2, expireAt: 0 })
    await store.increment("k")
    expect(redis.pexpire).toHaveBeenCalled()
  })

  it.fails("Upstash store decrement and resetKey work", async () => {
    // @ts-ignore - module created in P4
    const { UpstashStore } = await import("../rate-limit.js")
    const { redis } = fakeRedis()
    const store = new UpstashStore("p", 60_000, redis as any)
    await store.increment("k")
    await store.decrement("k")
    expect(redis.decr).toHaveBeenCalled()
    await store.resetKey("k")
    expect(redis.del).toHaveBeenCalled()
  })

  it.fails("Upstash store rolls over after window", async () => {
    // @ts-ignore - module created in P4
    const { UpstashStore } = await import("../rate-limit.js")
    const { redis, store: data } = fakeRedis()
    const store = new UpstashStore("p", 1000, redis as any)
    await store.increment("k")
    const cur = data.get("p:k")!
    cur.expireAt = Date.now() - 1
    cur.value = 5
    const b = await store.increment("k")
    expect(b.totalHits).toBe(1)
  })

  it.fails("public limiters pass on store error", async () => {
    // @ts-ignore - module created in P4
    const { createLimiter } = await import("../rate-limit.js")
    const broken = { increment: vi.fn(async () => { throw new Error("boom") }), decrement: vi.fn(), resetKey: vi.fn(), init: vi.fn() }
    const mw = createLimiter({
      prefix: "pub",
      windowMs: 1000,
      limit: 1,
      failClosed: false,
      store: broken as any,
      env: { NODE_ENV: "test" } as any,
    })
    const req = { ip: "1.2.3.4", headers: {} } as any
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), setHeader: vi.fn(), header: vi.fn() } as any
    await new Promise<void>((resolve) => mw(req, res, () => resolve()))
    expect(res.status).not.toHaveBeenCalledWith(503)
  })

  it.fails("admin limiters fail closed with 503 on store error", async () => {
    // @ts-ignore - module created in P4
    const { createLimiter } = await import("../rate-limit.js")
    const broken = { increment: vi.fn(async () => { throw new Error("boom") }), decrement: vi.fn(), resetKey: vi.fn(), init: vi.fn() }
    const mw = createLimiter({
      prefix: "adm",
      windowMs: 1000,
      limit: 1,
      failClosed: true,
      store: broken as any,
      env: { NODE_ENV: "test" } as any,
    })
    const req = { ip: "1.2.3.4", headers: {} } as any
    const json = vi.fn()
    const status = vi.fn(() => ({ json }))
    const res = { status, json, setHeader: vi.fn(), header: vi.fn() } as any
    await new Promise<void>((resolve) => mw(req, res, () => resolve()))
    expect(status).toHaveBeenCalledWith(503)
  })

  it.fails("no direct rateLimit( outside lib/rate-limit.ts", async () => {
    const fs = await import("node:fs")
    const path = await import("node:path")
    const root = path.resolve(process.cwd(), "src")
    const hits: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.isFile() && full.endsWith(".ts")) {
          if (full.endsWith(path.join("lib", "rate-limit.ts"))) continue
          const text = fs.readFileSync(full, "utf8")
          if (text.includes("rateLimit(")) hits.push(path.relative(root, full))
        }
      }
    }
    walk(root)
    expect(hits).toEqual([])
  })
})
