import express from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { withServer } from "../../test/harness.js"

const analytics = vi.hoisted(() => ({ record: vi.fn() }))
const limiters = vi.hoisted(() => ({
  analytics: vi.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}))

vi.mock("../store.js", () => ({ resolveAnalyticsStore: () => analytics }))
vi.mock("../../lib/rate-limit.js", () => ({ analyticsLimiter: limiters.analytics }))

import { createAnalyticsRouter } from "../router.js"

function app() {
  const instance = express()
  instance.use(express.json())
  instance.use("/api/analytics", createAnalyticsRouter())
  return instance
}

beforeEach(() => {
  analytics.record.mockReset().mockResolvedValue(undefined)
  limiters.analytics.mockReset().mockImplementation((_req: unknown, _res: unknown, next: () => void) => next())
})

describe("POST /api/analytics", () => {
  it("records a valid event and returns no content", async () => {
    const res = await withServer(app(), (base) => fetch(`${base}/api/analytics`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "resources_viewed", filter: "courses" }),
    }))

    expect(res.status).toBe(204)
    expect(analytics.record).toHaveBeenCalledWith("resources_viewed", { filter: "courses" })
    expect(limiters.analytics).toHaveBeenCalledTimes(1)
  })

  it("refuses unknown events before touching the store", async () => {
    const res = await withServer(app(), (base) => fetch(`${base}/api/analytics`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "track_user", userId: "private" }),
    }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "Invalid analytics event" })
    expect(analytics.record).not.toHaveBeenCalled()
  })

  it("lets the limiter refuse an event before touching the store", async () => {
    limiters.analytics.mockImplementation((_req: unknown, res: unknown) => {
      const response = res as { status(code: number): { json(body: unknown): void } }
      response.status(429).json({ error: "Too many analytics events. Please try again later." })
    })

    const res = await withServer(app(), (base) => fetch(`${base}/api/analytics`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "resources_viewed", filter: "courses" }),
    }))

    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: "Too many analytics events. Please try again later." })
    expect(analytics.record).not.toHaveBeenCalled()
  })

  it("still returns no content when the telemetry store is unavailable", async () => {
    analytics.record.mockRejectedValueOnce(new Error("store down"))

    const res = await withServer(app(), (base) => fetch(`${base}/api/analytics`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "resources_viewed", filter: "courses" }),
    }))

    expect(res.status).toBe(204)
    expect(analytics.record).toHaveBeenCalledTimes(1)
  })
})
