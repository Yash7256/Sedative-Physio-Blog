import express from "express"
import { describe, expect, it } from "vitest"

import { createDeliveryLimiters } from "../webhook.js"

/**
 * The per-IP limiter is only as trustworthy as `req.ip`, which `trust proxy`
 * derives from `X-Forwarded-For`. If the edge forwards a client-supplied header
 * instead of appending to it, a caller can mint unlimited distinct IPs and walk
 * straight through a per-IP limit — so these assert the process-wide ceiling
 * still holds when the header is rotated on every request.
 *
 * Limits are tiny so the whole file runs in milliseconds; the production values
 * are 300/3000 per minute.
 */

const PER_IP = 3
const GLOBAL = 6

// The limiters hold state per process, so each test needs a fresh app.
async function withLimits(perIp: number, global: number) {
  const { perIp: p, globalCeiling: g } = createDeliveryLimiters({ perIp, global })
  const app = express()
  app.set("trust proxy", 1)
  app.post("/hook", p, g, (_req, res) => {
    res.status(200).json({ received: true })
  })
  const s = app.listen(0)
  await new Promise((resolve) => s.once("listening", resolve))
  const address = s.address() as { port: number }
  return {
    url: `http://127.0.0.1:${address.port}/hook`,
    close: () => new Promise((resolve) => s.close(resolve)),
  }
}

const post = (url: string, headers: Record<string, string> = {}) =>
  fetch(url, { method: "POST", headers, body: "{}" })

describe("per-IP limiting", () => {
  it("allows a burst up to the limit and then 429s", async () => {
    const { url, close } = await withLimits(PER_IP, GLOBAL)
    const codes: number[] = []
    for (let i = 0; i < PER_IP + 1; i++) codes.push((await post(url)).status)
    await close()
    expect(codes).toEqual([200, 200, 200, 429])
  })

  it("tells the client when to come back", async () => {
    const { url, close } = await withLimits(1, 10)
    await post(url)
    const limited = await post(url)
    const retryAfter = limited.headers.get("retry-after")
    await close()
    expect(limited.status).toBe(429)
    // Clerk backs off on 429, but only if it is told how long to wait.
    expect(retryAfter).toMatch(/^\d+$/)
  })

  it("does not rate limit a different address", async () => {
    const { url, close } = await withLimits(1, 100)
    const first = await post(url, { "x-forwarded-for": "203.0.113.1" })
    const second = await post(url, { "x-forwarded-for": "203.0.113.2" })
    await close()
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
  })
})

describe("global ceiling", () => {
  it("stops a flood that rotates X-Forwarded-For on every request", async () => {
    // The regression this backstop exists for: a fresh spoofed IP per request
    // means the per-IP limiter never trips, so only the constant-keyed ceiling
    // is left holding.
    const { url, close } = await withLimits(50, GLOBAL)
    const codes: number[] = []
    for (let i = 0; i < GLOBAL + 3; i++) {
      codes.push((await post(url, { "x-forwarded-for": `198.51.100.${i}` })).status)
    }
    await close()

    expect(codes.slice(0, GLOBAL)).toEqual(Array(GLOBAL).fill(200))
    expect(codes.slice(GLOBAL)).toEqual([429, 429, 429])
  })

  it("bounds the flood even when no forwarded header is sent at all", async () => {
    const { url, close } = await withLimits(50, GLOBAL)
    const codes: number[] = []
    for (let i = 0; i < GLOBAL + 1; i++) codes.push((await post(url)).status)
    await close()
    expect(codes[GLOBAL]).toBe(429)
  })
})
