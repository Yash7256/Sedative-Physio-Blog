import { Router } from "express"

import {
  getClerkPublishableKey,
  isPublishableKeyConfigured,
} from "../auth/config.js"
import { prisma } from "../lib/prisma.js"
import { getRedisClient } from "../lib/redis.js"
import { probeStorage } from "../notes/r2.js"
import { paymentsReachable } from "../payments/service.js"

export const healthRouter = Router()

/** Liveness only: it must stay answerable even when a dependency is down. */
healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() })
})

export interface ReadinessReport {
  status: "ready" | "unavailable"
  checks: {
    database: boolean
    clerk: boolean
    redis: boolean
    storage: boolean
    payments: boolean
  }
}

const PROBE_TIMEOUT_MS = 1_000

/**
 * A probe that takes too long is a failed dependency. The fallback is always
 * `false`, so a slow or broken store can never make readiness look healthy.
 */
async function bounded<T>(work: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("readiness probe timed out")), PROBE_TIMEOUT_MS)
      }),
    ])
  } catch {
    return fallback
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Booleans only: readiness is for an orchestrator to decide whether to route
 * traffic here, not a place to publish connection strings or error messages.
 */
export async function readinessReport(env: NodeJS.ProcessEnv = process.env): Promise<ReadinessReport> {
  const [database, redis, storage, payments] = await Promise.all([
    bounded(
      Promise.resolve().then(async () => {
        if (!env.DATABASE_URL) return false
        await prisma.$queryRaw`SELECT 1`
        return true
      }),
      false,
    ),
    bounded(
      Promise.resolve().then(async () => {
        if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return false
        await getRedisClient(env, "readiness").get("__readiness__")
        return true
      }),
      false,
    ),
    bounded(probeStorage(), false),
    bounded(paymentsReachable(env), false),
  ])

  const checks = {
    database,
    clerk: Boolean(env.CLERK_SECRET_KEY) && isPublishableKeyConfigured(getClerkPublishableKey(env)),
    redis,
    storage,
    payments,
  }
  return {
    status: Object.values(checks).every(Boolean) ? "ready" : "unavailable",
    checks,
  }
}

healthRouter.get("/ready", async (_req, res) => {
  const report = await readinessReport()
  res.status(report.status === "ready" ? 200 : 503).json(report)
})
