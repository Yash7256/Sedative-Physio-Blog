import { beforeEach, describe, expect, it, vi } from "vitest"

import { withServer } from "../test/harness.js"

const mocks = vi.hoisted(() => ({
  clerkCalls: vi.fn(),
  listCourses: vi.fn(async () => ({ items: [], nextCursor: null })),
  getCourseBySlug: vi.fn(async () => ({ id: "c1", slug: "intro" })),
  listModels: vi.fn(async () => ({ items: [], nextCursor: null })),
  listNotes: vi.fn(async () => ({ items: [], nextCursor: null })),
  getDownload: vi.fn(async () => ({ fileName: "note.pdf", url: "https://example.test/note.pdf" })),
  getNoteFile: vi.fn(async () => ({
    fileName: "note.pdf",
    fileKey: "notes/note.pdf",
    fileSize: 1,
  })),
}))

vi.doMock("@clerk/express", () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => {
    mocks.clerkCalls()
    next()
  },
}))

vi.doMock("../auth/config.js", () => ({
  getAuthorizedParties: () => [],
  assertProductionConfig: () => undefined,
}))

vi.doMock("../courses/service.js", () => ({
  listCourses: mocks.listCourses,
  getCourseBySlug: mocks.getCourseBySlug,
}))

vi.doMock("../models/service.js", () => ({
  listModels: mocks.listModels,
}))

vi.doMock("../notes/service.js", () => ({
  listNotes: mocks.listNotes,
  getDownload: mocks.getDownload,
  getNoteFile: mocks.getNoteFile,
}))

let createApp: (typeof import("../app.js"))["createApp"]
const assertCatalogHeaders = (res: Response): void => {
  expect(res.status).toBe(200)
  expect(res.headers.get("cache-control")).toContain("s-maxage=120")
  expect(res.headers.get("etag")).toBeTruthy()
  expect(res.headers.get("vercel-cache-tag")).toBeTruthy()
}

beforeEach(async () => {
  vi.resetModules()
  mocks.clerkCalls.mockClear()
  mocks.listCourses.mockClear()
  mocks.getCourseBySlug.mockClear()
  mocks.listModels.mockClear()
  mocks.listNotes.mockClear()
  mocks.getDownload.mockClear()
  mocks.getNoteFile.mockClear()
  const appModule = await import("../app.js")
  createApp = appModule.createApp
})

describe("public catalog fast path", () => {
  it("serves public catalog reads without invoking Clerk", async () => {
    await withServer(createApp(), async (base) => {
      const paths = ["/api/courses", "/api/courses/intro", "/api/models", "/api/notes"]
      for (const path of paths) {
        assertCatalogHeaders(await fetch(`${base}${path}`))
      }
      expect(mocks.clerkCalls).not.toHaveBeenCalled()
    })
  })

  it("still invokes Clerk for note files and admin routes", async () => {
    await withServer(createApp(), async (base) => {
      const download = await fetch(`${base}/api/notes/n1/download`)
      expect(download.status).toBe(200)
      expect(mocks.getDownload).toHaveBeenCalledTimes(1)

      const purge = await fetch(`${base}/api/cache/purge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ catalogs: ["courses"] }),
      })
      expect(purge.status).toBe(401)

      expect(mocks.clerkCalls).toHaveBeenCalledTimes(2)
    })
  })

  it("keeps unknown API routes uncached", async () => {
    await withServer(createApp(), async (base) => {
      const res = await fetch(`${base}/api/not-a-route`)
      expect(res.status).toBe(404)
      expect(res.headers.get("cache-control")).toContain("no-store")
      expect(await res.json()).toEqual({ error: "Not found" })
    })
  })
})
