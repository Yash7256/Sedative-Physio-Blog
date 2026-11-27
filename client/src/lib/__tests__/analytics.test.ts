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
  it("uses a credential-free keepalive fetch and never uses sendBeacon", async () => {
    const beacon = vi.fn(() => true)
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: beacon })
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", fetchMock)

    trackResourceFlow("resources_viewed", { filter: "courses" })

    expect(beacon).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analytics",
      expect.objectContaining({
        method: "POST",
        credentials: "omit",
        keepalive: true,
        headers: { "content-type": "application/json" },
      }),
    )
    const init = fetchMock.mock.calls[0]![1] as RequestInit
    expect(JSON.parse(String(init.body))).toEqual({ event: "resources_viewed", filter: "courses" })
  })

  it("swallows a failed send so telemetry cannot break the page", async () => {
    Reflect.deleteProperty(navigator, "sendBeacon")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))

    expect(() => trackResourceFlow("courses_load_more_clicked")).not.toThrow()
    await Promise.resolve()
  })
})
