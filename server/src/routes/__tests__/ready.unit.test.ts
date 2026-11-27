import express from "express"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { withServer } from "../../test/harness.js"

const mocks = vi.hoisted(() => ({
  storageReady: true,
  storageReachable: true,
  databaseReady: true,
  redisReady: true,
  paymentsReady: true,
}))
vi.mock("../../notes/r2.js", () => ({
  r2Configured: () => mocks.storageReady,
  probeStorage: () => Promise.resolve(mocks.storageReady && mocks.storageReachable),
}))
vi.mock("../../lib/redis.js", () => ({
  getRedisClient: () => ({
    get: () => mocks.redisReady ? Promise.resolve(null) : Promise.reject(new Error("redis down")),
  }),
}))
vi.mock("../../payments/service.js", () => ({
  paymentsReachable: (env: NodeJS.ProcessEnv) => Promise.resolve(
    Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) && mocks.paymentsReady,
  ),
}))
vi.mock("../../lib/prisma.js", () => ({
  prisma: { $queryRaw: () => mocks.databaseReady ? Promise.resolve([{ ok: 1 }]) : Promise.reject(new Error("db down")) },
}))

import { healthRouter, readinessReport } from "../health.js"

const complete: Record<string, string> = {
  DATABASE_URL: "postgres://db.internal/private",
  CLERK_SECRET_KEY: "secret-value",
  CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZSQ",
  UPSTASH_REDIS_REST_URL: "https://redis.internal/private",
  UPSTASH_REDIS_REST_TOKEN: "redis-token",
  RAZORPAY_KEY_ID: "rzp_test_id",
  RAZORPAY_KEY_SECRET: "payment-secret",
}
const originals = new Map<string, string | undefined>()

function app() {
  const instance = express()
  instance.use("/api/health", healthRouter)
  return instance
}

beforeEach(() => {
  mocks.storageReady = true
  mocks.storageReachable = true
  mocks.databaseReady = true
  mocks.redisReady = true
  mocks.paymentsReady = true
  for (const key of Object.keys(complete)) {
    originals.set(key, process.env[key])
    process.env[key] = complete[key]!
  }
})

afterEach(() => {
  for (const [key, value] of originals) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  originals.clear()
})

describe("health and readiness", () => {
  it("keeps the liveness response shape stable", async () => {
    await withServer(app(), async (base) => {
      const res = await fetch(`${base}/api/health`)
      expect(res.status).toBe(200)
      const body = (await res.json()) as Record<string, unknown>
      expect(Object.keys(body)).toEqual(["status", "uptime"])
      expect(body.status).toBe("ok")
      expect(typeof body.uptime).toBe("number")
    })
  })

  it("reports boolean dependency state when everything is configured", async () => {
    await withServer(app(), async (base) => {
      const res = await fetch(`${base}/api/health/ready`)
      expect(res.status).toBe(200)
      const body = await res.text()
      expect(JSON.parse(body)).toEqual({
        status: "ready",
        checks: {
          database: true,
          clerk: true,
          redis: true,
          storage: true,
          payments: true,
        },
      })
      for (const value of Object.values(complete)) expect(body).not.toContain(value)
      expect(body).not.toMatch(/RAZORPAY|UPSTASH|CLERK|DATABASE_URL|R2_/)
    })
  })

  it("returns 503 when a dependency is not configured", async () => {
    delete process.env.RAZORPAY_KEY_ID
    mocks.storageReady = false

    await withServer(app(), async (base) => {
      const res = await fetch(`${base}/api/health/ready`)
      expect(res.status).toBe(503)
      expect((await readinessReport()).checks).toMatchObject({ payments: false, storage: false })
      expect((await readinessReport()).status).toBe("unavailable")
    })
  })

  it("reports an unreachable database as unavailable", async () => {
    mocks.databaseReady = false

    await withServer(app(), async (base) => {
      const res = await fetch(`${base}/api/health/ready`)
      expect(res.status).toBe(503)
      expect((await res.json() as { checks: { database: boolean } }).checks.database).toBe(false)
    })
  })

  it("does not report ready when configured dependencies cannot be reached", async () => {
    mocks.redisReady = false
    mocks.storageReachable = false
    mocks.paymentsReady = false

    await withServer(app(), async (base) => {
      const res = await fetch(`${base}/api/health/ready`)
      expect(res.status).toBe(503)
      const report = await readinessReport()
      expect(report.status).toBe("unavailable")
      expect(report.checks).toMatchObject({ redis: false, storage: false, payments: false })
    })
  })
})
