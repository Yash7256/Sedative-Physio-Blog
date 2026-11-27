import { Router, type RequestHandler } from "express"

import { analyticsLimiter } from "../lib/rate-limit.js"
import { parseAnalyticsPayload } from "./payload.js"
import { resolveAnalyticsStore, type AnalyticsStore } from "./store.js"

export interface AnalyticsRouterOptions {
  store?: AnalyticsStore | null
  limiter?: RequestHandler
}

export function createAnalyticsRouter(options: AnalyticsRouterOptions = {}) {
  const store = options.store === undefined ? resolveAnalyticsStore() : options.store
  const limiter = options.limiter ?? analyticsLimiter
  const router = Router()

  router.post("/", limiter, async (req, res) => {
    const parsed = parseAnalyticsPayload(req.body)
    if (!parsed) {
      res.status(400).json({ error: "Invalid analytics event" })
      return
    }

    if (store) {
      try {
        await store.record(parsed.event, parsed.payload)
      } catch {
        // Telemetry is best-effort and must never break the public catalog.
      }
    }
    res.status(204).end()
  })

  return router
}

export const analyticsRouter = createAnalyticsRouter()
