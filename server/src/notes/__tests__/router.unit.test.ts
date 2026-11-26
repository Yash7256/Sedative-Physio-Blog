import express from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { encodeCursor } from "../../lib/pagination.js"
import { withServer } from "../../test/harness.js"

const serviceMock = vi.hoisted(() => ({
  listNotes: vi.fn(),
  getDownload: vi.fn(),
  getNoteFile: vi.fn(),
}))

vi.mock("../service.js", () => serviceMock)

import { notesPublicRouter, notesRouter } from "../router.js"

function app() {
  const instance = express()
  instance.use("/api/notes", notesPublicRouter)
  instance.use("/api/notes", notesRouter)
  return instance
}

beforeEach(() => {
  serviceMock.listNotes.mockReset().mockResolvedValue({ items: [{ id: "n1" }], nextCursor: null })
})

describe("GET /api/notes pagination contract", () => {
  it("returns a page and forwards category, limit and decoded cursor", async () => {
    const res = await withServer(app(), (base) =>
      fetch(`${base}/api/notes?category=notes&limit=3&cursor=${encodeURIComponent(encodeCursor("n1"))}`))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ items: [{ id: "n1" }], nextCursor: null })
    expect(serviceMock.listNotes).toHaveBeenCalledWith("notes", { limit: 3, cursorId: "n1" })
  })

  it("rejects an invalid cursor before touching the service", async () => {
    const res = await withServer(app(), (base) => fetch(`${base}/api/notes?cursor=n1`))

    expect(res.status).toBe(400)
    expect(serviceMock.listNotes).not.toHaveBeenCalled()
  })
})
