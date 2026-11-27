import express, { type NextFunction, type Request, type Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { noStore } from "../../lib/cache.js"
import { withServer } from "../../test/harness.js"

const calls: string[] = []
const limiters = vi.hoisted(() => ({ detail: vi.fn() }))
const serviceMock = vi.hoisted(() => ({ getCourseBySlug: vi.fn(), listCourses: vi.fn() }))

vi.mock("../../lib/rate-limit.js", () => ({
  catalogListLimiter: (_req: Request, _res: Response, next: NextFunction) => {
    calls.push("list-limiter")
    next()
  },
  courseDetailLimiter: limiters.detail,
}))

vi.mock("../service.js", () => serviceMock)

import { coursesRouter } from "../router.js"

function app() {
  const instance = express()
  instance.use(noStore())
  instance.use("/api/courses", coursesRouter)
  return instance
}

const detail = {
  id: "c1",
  title: "Course",
  slug: "course",
  shortDescription: null,
  thumbnail: null,
  level: "Beginner",
  language: "English",
  estimatedHours: null,
  highlights: [],
  price: 0,
  isFree: true,
  tutor: null,
  sections: [],
}

beforeEach(() => {
  calls.length = 0
  limiters.detail.mockReset().mockImplementation((_req: Request, _res: Response, next: NextFunction) => {
    calls.push("detail-limiter")
    next()
  })
  serviceMock.getCourseBySlug.mockReset().mockResolvedValue(detail)
  serviceMock.listCourses.mockReset().mockResolvedValue({ items: [], nextCursor: null })
})

describe("GET /api/courses/:slug rate limit", () => {
  it("returns 429 before the service is called when the detail limiter blocks", async () => {
    limiters.detail.mockImplementation((_req: Request, res: Response) => {
      calls.push("detail-limiter")
      res.status(429).json({ error: "Too many course detail requests" })
    })

    const res = await withServer(app(), (base) => fetch(`${base}/api/courses/course`))

    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: "Too many course detail requests" })
    expect(serviceMock.getCourseBySlug).not.toHaveBeenCalled()
    expect(calls).toEqual(["detail-limiter"])
    expect(res.headers.get("cache-control")).toContain("no-store")
  })

  it("serves a cached-eligible response when the detail limiter allows the request", async () => {
    const res = await withServer(app(), (base) => fetch(`${base}/api/courses/allowed`))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(detail)
    expect(calls).toEqual(["detail-limiter"])
    expect(res.headers.get("cache-control")).toContain("s-maxage=120")
  })
})
