import express, { type NextFunction, type Request, type Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { withServer } from "../../test/harness.js"

const limiters = vi.hoisted(() => ({
  list: vi.fn(),
  detail: vi.fn(),
}))
const services = vi.hoisted(() => ({
  listCourses: vi.fn(),
  getCourseBySlug: vi.fn(),
  listModels: vi.fn(),
  listNotes: vi.fn(),
}))

vi.mock("../rate-limit.js", () => ({
  catalogListLimiter: limiters.list,
  courseDetailLimiter: limiters.detail,
  createLimiter: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
}))
vi.mock("../../courses/service.js", () => services)
vi.mock("../../models/service.js", () => services)
vi.mock("../../notes/service.js", () => services)

import { coursesRouter } from "../../courses/router.js"
import { modelsRouter } from "../../models/router.js"
import { notesPublicRouter } from "../../notes/router.js"

function app() {
  const instance = express()
  instance.use("/api/courses", coursesRouter)
  instance.use("/api/models", modelsRouter)
  instance.use("/api/notes", notesPublicRouter)
  return instance
}

const page = { items: [], nextCursor: null }

beforeEach(() => {
  limiters.list.mockReset().mockImplementation((_req: Request, _res: Response, next: NextFunction) => next())
  limiters.detail.mockReset().mockImplementation((_req: Request, _res: Response, next: NextFunction) => next())
  services.listCourses.mockReset().mockResolvedValue(page)
  services.getCourseBySlug.mockReset().mockResolvedValue({ id: "c1", slug: "cached-detail" })
  services.listModels.mockReset().mockResolvedValue(page)
  services.listNotes.mockReset().mockResolvedValue(page)
})

describe("public catalog cache/limiter order", () => {
  it("does not spend list quota on served cache hits", async () => {
    await withServer(app(), async (base) => {
      for (const path of ["/api/courses", "/api/models", "/api/notes"]) {
        expect((await fetch(`${base}${path}`)).status).toBe(200)
        expect((await fetch(`${base}${path}`)).status).toBe(200)
      }
    })

    expect(limiters.list).toHaveBeenCalledTimes(3)
    expect(services.listCourses).toHaveBeenCalledTimes(1)
    expect(services.listModels).toHaveBeenCalledTimes(1)
    expect(services.listNotes).toHaveBeenCalledTimes(1)
  })

  it("does not spend detail quota on a served cache hit", async () => {
    await withServer(app(), async (base) => {
      expect((await fetch(`${base}/api/courses/cached-detail`)).status).toBe(200)
      expect((await fetch(`${base}/api/courses/cached-detail`)).status).toBe(200)
    })

    expect(limiters.detail).toHaveBeenCalledTimes(1)
    expect(services.getCourseBySlug).toHaveBeenCalledTimes(1)
  })
})
