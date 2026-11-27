import express, { type NextFunction, type Request, type Response } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { noStore } from "../../lib/cache.js"
import { withServer } from "../../test/harness.js"

const limiter = vi.hoisted(() => vi.fn())
const service = vi.hoisted(() => ({ getCourseBySlug: vi.fn() }))

vi.mock("../../lib/rate-limit.js", () => ({
  courseDetailLimiter: limiter,
  catalogListLimiter: (_req: Request, _res: Response, next: NextFunction) => next(),
  createLimiter: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
}))
vi.mock("../../courses/service.js", () => service)

import { createCoursePageRouter } from "../router.js"

const env = {
  CORS_ALLOWED_ORIGINS: "https://sedative.test",
  NODE_ENV: "production",
} as NodeJS.ProcessEnv

function app() {
  const instance = express()
  instance.use(noStore())
  instance.use("/courses", createCoursePageRouter({ env }))
  return instance
}

const detail = {
  id: "c1",
  title: "Clinical Reasoning",
  slug: "clinical-reasoning",
  shortDescription: "Learn a repeatable assessment workflow.",
  thumbnail: "/courses/clinical-reasoning.png",
  level: "Beginner",
  language: "English",
  estimatedHours: 8,
  highlights: [],
  price: 49900,
  isFree: false,
  tutor: null,
  sections: [],
}

beforeEach(() => {
  limiter.mockReset().mockImplementation((_req: Request, _res: Response, next: NextFunction) => next())
  service.getCourseBySlug.mockReset().mockResolvedValue(detail)
})

describe("server-rendered course SEO shell", () => {
  it("puts course metadata, JSON-LD and the SPA entry points in the first HTML response", async () => {
    const res = await withServer(app(), (base) => fetch(`${base}/courses/clinical-reasoning`))
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/html")
    expect(res.headers.get("cache-control")).toContain("s-maxage=120")
    expect(html).toContain("<title>Clinical Reasoning | Sedative Physio</title>")
    expect(html).toContain('name="description" content="Learn a repeatable assessment workflow."')
    expect(html).toContain('rel="canonical" href="https://sedative.test/courses/clinical-reasoning"')
    expect(html).toContain('property="og:image" content="https://sedative.test/courses/clinical-reasoning.png"')
    expect(html).toContain('"@type":"Course"')
    expect(html).toContain('"price":"499"')
    expect(html).toContain('<div id="root">')
    expect(html).toContain('<script type="module" src="/assets/main.js">')
    expect(html).toContain('<link rel="stylesheet" href="/assets/index.css">')
    expect(limiter).toHaveBeenCalledTimes(1)
  })

  it("escapes catalog text and refuses an off-origin image", async () => {
    service.getCourseBySlug.mockResolvedValueOnce({
      ...detail,
      title: `</title><script>alert(1)</script>`,
      shortDescription: `" onload="alert(1)`,
      thumbnail: "//evil.example/tracker.png",
    })

    const res = await withServer(app(), (base) => fetch(`${base}/courses/clinical-reasoning`))
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(html).not.toContain("<script>alert(1)</script>")
    expect(html).toContain("&lt;/title&gt;")
    expect(html).toContain("&quot; onload=&quot;")
    expect(html).not.toContain("evil.example")
    expect(html).not.toContain('property="og:image"')
  })

  it("returns a generic SEO shell for an unknown course", async () => {
    service.getCourseBySlug.mockResolvedValueOnce(null)

    const res = await withServer(app(), (base) => fetch(`${base}/courses/unknown-course`))
    const html = await res.text()

    expect(res.status).toBe(404)
    expect(html).toContain("<title>Course not found | Sedative Physio</title>")
    expect(html).toContain('name="robots" content="noindex"')
    expect(html).toContain('<script type="module" src="/assets/main.js">')
    expect(html).not.toContain('"@type":"Course"')
  })

  it("rejects a malformed slug before querying the course", async () => {
    const res = await withServer(app(), (base) => fetch(`${base}/courses/foo%3Cscript%3E`))

    expect(res.status).toBe(404)
    expect(service.getCourseBySlug).not.toHaveBeenCalled()
    expect(await res.text()).not.toContain("<script>alert")
  })

  it("returns 429 before the DB read when the detail limiter blocks", async () => {
    limiter.mockImplementation((_req: Request, res: Response) => {
      res.status(429).json({ error: "Too many course detail requests" })
    })

    const res = await withServer(app(), (base) => fetch(`${base}/courses/clinical-reasoning`))

    expect(res.status).toBe(429)
    expect(service.getCourseBySlug).not.toHaveBeenCalled()
  })
})
