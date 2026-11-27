import express from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { encodeCursor } from "../../lib/pagination.js"
import { withServer } from "../../test/harness.js"

const createdAt = new Date("2026-01-01T00:00:00.000Z")

const serviceMock = vi.hoisted(() => ({ listModels: vi.fn() }))

vi.mock("../service.js", () => serviceMock)

import { modelsRouter } from "../router.js"

function app() {
  const instance = express()
  instance.use("/api/models", modelsRouter)
  return instance
}

beforeEach(() => {
  serviceMock.listModels.mockReset().mockResolvedValue({ items: [{ id: "m1" }], nextCursor: null })
})

describe("GET /api/models pagination contract", () => {
  it("returns a page and caps an oversized limit", async () => {
    const res = await withServer(app(), (base) => fetch(`${base}/api/models?limit=500`))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ items: [{ id: "m1" }], nextCursor: null })
    expect(serviceMock.listModels).toHaveBeenCalledWith({ limit: 50, cursorId: null })
  })

  it("decodes the opaque cursor", async () => {
    await withServer(app(), (base) =>
      fetch(`${base}/api/models?cursor=${encodeURIComponent(encodeCursor({ id: "m1", createdAt }))}`))

    expect(serviceMock.listModels).toHaveBeenCalledWith({
      limit: 12,
      cursorId: "m1",
      cursorCreatedAt: createdAt,
    })
  })
})
