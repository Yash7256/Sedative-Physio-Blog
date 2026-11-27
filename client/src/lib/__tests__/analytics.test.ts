import { afterEach, describe, expect, it, vi } from "vitest"

import { normalizeResourceFlowEvent, trackResourceFlow } from "../analytics"

const originalSendBeacon = navigator.sendBeacon

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalSendBeacon) {
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: originalSendBeacon })
  } else {
    Reflect.deleteProperty(navigator, "sendBeacon")
  }
})

describe("resource flow analytics normalization", () => {
  it("keeps only allowlisted fields and bounds numeric values", () => {
    expect(normalizeResourceFlowEvent({
      event: "course_cards_rendered",
      filter: "notes",
      count: 999,
      durationMs: -20,
      userId: "private",
    })).toEqual({
      event: "course_cards_rendered",
      count: 50,
      durationMs: 0,
    })
  })

  it("rejects unknown events and unsafe status buckets", () => {
    expect(normalizeResourceFlowEvent({ event: "button_click", count: 1 })).toBeNull()
    expect(normalizeResourceFlowEvent({ event: "courses_catalog_failed", statusBucket: "401" })).toBeNull()
  })
})

describe("trackResourceFlow", () => {
  it("sends an allowlisted event through sendBeacon without credentials", async () => {
    const beacon = vi.fn(() => true)
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: beacon })
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    trackResourceFlow("courses_catalog_failed", { statusBucket: "5xx", durationMs: 1234 })

    expect(beacon).toHaveBeenCalledTimes(1)
    const [url, body] = beacon.mock.calls[0] as unknown as [string, Blob]
    expect(url).toBe("/api/analytics")
    expect(JSON.parse(await body.text())).toEqual({
      event: "courses_catalog_failed",
      statusBucket: "5xx",
      durationMs: 1234,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("falls back to a credential-free keepalive fetch", () => {
    Reflect.deleteProperty(navigator, "sendBeacon")
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    trackResourceFlow("resources_viewed", { filter: "courses" })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analytics",
      expect.objectContaining({ method: "POST", credentials: "omit", keepalive: true }),
    )
    const init = fetchMock.mock.calls[0]![1] as RequestInit
    expect(JSON.parse(String(init.body))).toEqual({ event: "resources_viewed", filter: "courses" })
  })
})
