import { describe, expect, it } from "vitest"

import { parseAnalyticsPayload } from "../payload.js"

describe("analytics payload validation", () => {
  it("accepts an allowlisted resource-flow event and drops unknown keys", () => {
    expect(parseAnalyticsPayload({
      event: "course_cards_rendered",
      count: 12,
      durationMs: 450,
      userId: "private",
    })).toEqual({
      event: "course_cards_rendered",
      payload: { count: 12, durationMs: 450 },
    })
  })

  it("rejects unknown events, buckets and non-object bodies", () => {
    expect(parseAnalyticsPayload({ event: "click", count: 1 })).toBeNull()
    expect(parseAnalyticsPayload({ event: "courses_catalog_failed", statusBucket: "401" })).toBeNull()
    expect(parseAnalyticsPayload(null)).toBeNull()
    expect(parseAnalyticsPayload("resources_viewed")).toBeNull()
  })

  it("bounds numeric fields instead of trusting the caller", () => {
    expect(parseAnalyticsPayload({
      event: "courses_catalog_succeeded",
      count: 999,
      durationMs: -5,
      filter: "notes",
    })).toEqual({
      event: "courses_catalog_succeeded",
      payload: { count: 50, durationMs: 0 },
    })
  })
})
