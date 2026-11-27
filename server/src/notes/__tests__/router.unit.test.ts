import express from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { encodeCursor } from "../../lib/pagination.js"
import { withServer } from "../../test/harness.js"

const createdAt = new Date("2026-01-01T00:00:00.000Z")

const serviceMock = vi.hoisted(() => ({
  listNotes: vi.fn(),
  getNoteFile: vi.fn(),
}))

vi.mock("../service.js", () => serviceMock)

import { notesPublicRouter } from "../router.js"

function app() {
  const instance = express()
  instance.use("/api/notes", notesPublicRouter)
  return instance
}

beforeEach(() => {
  serviceMock.listNotes.mockReset().mockResolvedValue({ items: [{ id: "n1" }], nextCursor: null })
})

describe("GET /api/notes pagination contract", () => {
  it("returns a page and forwards category, limit and decoded cursor", async () => {
    const res = await withServer(app(), (base) =>
      fetch(`${base}/api/notes?category=notes&limit=3&cursor=${encodeURIComponent(encodeCursor({ id: "n1", createdAt }))}`))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ items: [{ id: "n1" }], nextCursor: null })
    expect(serviceMock.listNotes).toHaveBeenCalledWith("notes", {
      limit: 3,
      cursorId: "n1",
      cursorCreatedAt: createdAt,
    })
  })

  it("rejects an invalid cursor before touching the service", async () => {
    const res = await withServer(app(), (base) => fetch(`${base}/api/notes?cursor=n1`))

    expect(res.status).toBe(400)
    expect(serviceMock.listNotes).not.toHaveBeenCalled()
  })
})
