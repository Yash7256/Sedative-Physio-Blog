import express from "express"
import type { Request } from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { asUser, fakeAuth, withServer } from "../../test/harness.js"

const mocks = vi.hoisted(() => ({
  createLimiter: vi.fn(),
  listNotes: vi.fn(async () => ({ items: [], nextCursor: null })),
  getDownload: vi.fn(async () => ({ fileName: "a.pdf", url: "https://example.test/a.pdf" })),
  getNoteFile: vi.fn(async () => ({
    fileName: "a.pdf",
    fileKey: "notes/a.pdf",
    fileSize: 42,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  })),
  getObjectUrl: vi.fn(async () => "https://example.test/a.pdf"),
}))

vi.mock("../service.js", () => mocks)
vi.mock("../r2.js", () => ({ getObjectUrl: mocks.getObjectUrl, r2Configured: () => true }))
vi.doMock("../../lib/rate-limit.js", () => ({
  createLimiter: mocks.createLimiter,
  catalogListLimiter: (_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
    res.status(429).json({ error: "limited" })
  },
}))

let routers: typeof import("../router.js")

beforeEach(async () => {
  vi.resetModules()
  mocks.createLimiter.mockReset().mockImplementation(() => (_req: unknown, res: any) => {
    res.status(429).json({ error: "limited" })
  })
  routers = await import("../router.js")
})

function app() {
  const instance = express()
  fakeAuth(instance, asUser("user_7"))
  instance.use("/api/notes", routers.notesPublicRouter)
  instance.use("/api/notes", routers.notesRouter)
  return instance
}

describe("note route limiters", () => {
  it("mounts shared, fail-closed per-user limiters on note files and downloads", async () => {
    await withServer(app(), async (base) => {
      expect((await fetch(`${base}/api/notes`)).status).toBe(429)
      expect((await fetch(`${base}/api/notes/n1/download`)).status).toBe(429)
      expect((await fetch(`${base}/api/notes/n1/file`)).status).toBe(429)
    })

    const options = mocks.createLimiter.mock.calls.map((call) => call[0] as Record<string, unknown>)
    expect(options.map((option) => option["prefix"])).toEqual(["note-download", "note-file"])
    expect(options.every((option) => option["failClosed"] === true)).toBe(true)
    expect(options.every((option) => option["store"] === undefined)).toBe(true)

    const keyGenerator = options[0]!["keyGenerator"] as (req: Request) => string
    const request = { ip: "2001:db8:abcd:1234::1", auth: () => ({ userId: "user_7" }) } as unknown as Request
    expect(keyGenerator(request)).toBe("note-user:user_7")
    expect(keyGenerator(request)).not.toContain("2001")
  })
})
