import { beforeEach, describe, expect, it, vi } from "vitest"

import { createAnalyticsStore } from "../store.js"

const NOW = Date.parse("2026-11-27T10:30:00.000Z")

function fakeRedis() {
  const multi = {
    incr: vi.fn(),
    incrby: vi.fn(),
    pttl: vi.fn(),
    exec: vi.fn().mockResolvedValue([1, -1]),
  }
  multi.incr.mockReturnValue(multi)
  multi.incrby.mockReturnValue(multi)
  multi.pttl.mockReturnValue(multi)
  return {
    get: vi.fn(),
    incr: vi.fn(),
    incrby: vi.fn(),
    multi: vi.fn(() => multi),
    pexpire: vi.fn(),
    decr: vi.fn(),
    del: vi.fn(),
    multiHandle: multi,
  }
}

describe("analytics store", () => {
  let redis: ReturnType<typeof fakeRedis>

  beforeEach(() => {
    redis = fakeRedis()
  })

  it("records bounded counters in a fixed hourly bucket with a TTL", async () => {
    await createAnalyticsStore(redis).record(
      "course_cards_rendered",
      { count: 12, durationMs: 450 },
      NOW,
    )

    const keys = redis.multiHandle.incrby.mock.calls.map(([key]) => key as string)
    expect(keys).toEqual([
      "analytics:course_cards_rendered:all:ok:2026-11-27T10:00:00.000Z:events",
      "analytics:course_cards_rendered:all:ok:2026-11-27T10:00:00.000Z:cards",
      "analytics:course_cards_rendered:all:ok:2026-11-27T10:00:00.000Z:duration-ms",
    ])
    expect(redis.multiHandle.incrby.mock.calls.map(([, amount]) => amount)).toEqual([1, 12, 450])
    expect(redis.pexpire).toHaveBeenCalledWith(expect.any(String), 604_800_000)
  })

  it("does not create numeric keys for events without numeric fields", async () => {
    await createAnalyticsStore(redis).record("resources_viewed", { filter: "courses" }, NOW)

    expect(redis.multi).toHaveBeenCalledTimes(1)
    expect(redis.multiHandle.incrby.mock.calls[0]![0]).toContain("resources_viewed:courses:ok")
  })
})
