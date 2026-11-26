import express from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { encodeCursor } from "../../lib/pagination.js"
import { withServer } from "../../test/harness.js"

const serviceMock = vi.hoisted(() => ({
  listCourses: vi.fn(),
  getCourseBySlug: vi.fn(),
}))

vi.mock("../service.js", () => serviceMock)

import { coursesRouter } from "../router.js"

function app() {
  const instance = express()
  instance.use("/api/courses", coursesRouter)
  return instance
}

beforeEach(() => {
  serviceMock.listCourses.mockReset().mockResolvedValue({ items: [{ id: "c1" }], nextCursor: null })
})

describe("GET /api/courses pagination contract", () => {
  it("returns { items, nextCursor } and keeps the catalog cache header", async () => {
    const res = await withServer(app(), (base) => fetch(`${base}/api/courses`))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ items: [{ id: "c1" }], nextCursor: null })
    expect(res.headers.get("cache-control")).toContain("s-maxage=120")
    expect(res.headers.get("cache-control")).toContain("stale-while-revalidate=120")
    expect(serviceMock.listCourses).toHaveBeenCalledWith({ limit: 12, cursorId: null })
  })

  it("caps the limit and passes the decoded cursor to the service", async () => {
    await withServer(app(), (base) =>
      fetch(`${base}/api/courses?limit=500&cursor=${encodeURIComponent(encodeCursor("c1"))}`))

    expect(serviceMock.listCourses).toHaveBeenCalledWith({ limit: 50, cursorId: "c1" })
  })

  it("rejects a raw cursor with a JSON 400", async () => {
    const res = await withServer(app(), (base) => fetch(`${base}/api/courses?cursor=c1`))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "Invalid cursor" })
    expect(serviceMock.listCourses).not.toHaveBeenCalled()
  })
})
