import express from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { withServer } from "../../test/harness.js"

const mocks = vi.hoisted(() => ({
  listCourses: vi.fn(async () => ({ items: [], nextCursor: null })),
  getCourseBySlug: vi.fn(async () => null),
  listModels: vi.fn(async () => ({ items: [], nextCursor: null })),
  listNotes: vi.fn(async () => ({ items: [], nextCursor: null })),
}))

vi.mock("../../courses/service.js", () => mocks)
vi.mock("../../models/service.js", () => mocks)
vi.mock("../../notes/service.js", () => mocks)

vi.doMock("../rate-limit.js", () => ({
  catalogListLimiter: (_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
    res.status(429).json({ error: "limited" })
  },
  createLimiter: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}))

let app: express.Express

beforeEach(async () => {
  vi.resetModules()
  const { coursesRouter } = await import("../../courses/router.js")
  const { modelsRouter } = await import("../../models/router.js")
  const { notesPublicRouter } = await import("../../notes/router.js")
  app = express()
  app.use("/api/courses", coursesRouter)
  app.use("/api/models", modelsRouter)
  app.use("/api/notes", notesPublicRouter)
})

describe("public catalog list limiter", () => {
  it("covers every anonymous catalog list route", async () => {
    await withServer(app, async (base) => {
      for (const path of ["/api/courses", "/api/models", "/api/notes"]) {
        expect((await fetch(`${base}${path}`)).status).toBe(429)
      }
    })
    expect(mocks.listCourses).not.toHaveBeenCalled()
    expect(mocks.listModels).not.toHaveBeenCalled()
    expect(mocks.listNotes).not.toHaveBeenCalled()
  })
})
