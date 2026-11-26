import { describe, expect, it } from "vitest"

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  decodeCursor,
  encodeCursor,
  olderThan,
  pageResult,
  parsePageRequest,
} from "../pagination.js"

describe("catalog pagination", () => {
  describe("limit parsing", () => {
    it("defaults to 12 with no limit", () => {
      expect(parsePageRequest({})).toEqual({ limit: DEFAULT_PAGE_SIZE, cursorId: null })
      expect(DEFAULT_PAGE_SIZE).toBe(12)
    })

    it("caps an oversized limit at 50", () => {
      expect(parsePageRequest({ limit: "500" }).limit).toBe(MAX_PAGE_SIZE)
      expect(MAX_PAGE_SIZE).toBe(50)
    })

    it("rejects a non-numeric, zero or negative limit", () => {
      expect(() => parsePageRequest({ limit: "abc" })).toThrow("Invalid limit")
      expect(() => parsePageRequest({ limit: "0" })).toThrow("Invalid limit")
      expect(() => parsePageRequest({ limit: "-1" })).toThrow("Invalid limit")
      expect(() => parsePageRequest({ limit: ["12", "13"] })).toThrow("Invalid limit")
    })
  })

  describe("opaque cursor", () => {
    it("round-trips the last item's id", () => {
      const cursor = encodeCursor("course_123")
      expect(cursor).not.toBe("course_123")
      expect(decodeCursor(cursor)).toBe("course_123")
    })

    it("rejects a raw id, malformed base64, and a payload without a string id", () => {
      expect(() => decodeCursor("course_123")).toThrow("Invalid cursor")
      expect(() => decodeCursor("!!!not-base64!!!")).toThrow("Invalid cursor")
      expect(() => decodeCursor(Buffer.from('{"id":7}').toString("base64url"))).toThrow("Invalid cursor")
      expect(() => decodeCursor("")).toThrow("Invalid cursor")
      expect(() => decodeCursor(123)).toThrow("Invalid cursor")
    })

    it("reads the cursor from the page request", () => {
      const cursor = encodeCursor("note_9")
      expect(parsePageRequest({ cursor })).toEqual({ limit: 12, cursorId: "note_9" })
    })
  })

  it("builds a keyset that breaks createdAt ties by id", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z")
    expect(olderThan({ createdAt, id: "a" })).toEqual({
      OR: [
        { createdAt: { lt: createdAt } },
        { createdAt, id: { lt: "a" } },
      ],
    })
  })

  it("returns nextCursor null on the last page, and from the last kept item otherwise", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }]
    expect(pageResult(rows, 3)).toEqual({ items: rows, nextCursor: null })

    const page = pageResult(rows, 2)
    expect(page.items).toEqual([{ id: "a" }, { id: "b" }])
    expect(decodeCursor(page.nextCursor!)).toBe("b")
  })
})
