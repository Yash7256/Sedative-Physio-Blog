import express from "express"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { fileEtag } from "../../lib/cache.js"
import { NotFoundError, ServiceUnavailableError } from "../../lib/errors.js"
import { withServer } from "../../test/harness.js"

const realFetch = globalThis.fetch
const updatedAt = new Date("2026-03-01T12:00:00.000Z")

const mocks = vi.hoisted(() => ({
  listNotes: vi.fn(async () => ({ items: [], nextCursor: null })),
  getNoteFile: vi.fn(),
  getObjectUrl: vi.fn(async () => "https://example.test/a.pdf"),
}))

vi.mock("../service.js", () => mocks)
vi.mock("../r2.js", () => ({ getObjectUrl: mocks.getObjectUrl, r2Configured: () => true }))

import { notesPublicRouter } from "../router.js"

function app() {
  const instance = express()
  instance.set("etag", false)
  instance.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, private")
    next()
  })
  instance.use("/api/notes", notesPublicRouter)
  return instance
}

function noteFile(overrides: Record<string, unknown> = {}) {
  return {
    fileName: "a.pdf",
    fileKey: "notes/a.pdf",
    fileSize: 42,
    updatedAt,
    ...overrides,
  }
}

beforeEach(() => {
  mocks.listNotes.mockClear()
  mocks.getNoteFile.mockReset().mockResolvedValue(noteFile())
  mocks.getObjectUrl.mockClear()
  vi.stubGlobal("fetch", vi.fn(async () => new Response("%PDF", {
    status: 200,
    headers: { "content-length": "4" },
  })))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("note file access", () => {
  it("serves an anonymous caller the PDF and no longer exposes a download route", async () => {
    await withServer(app(), async (base) => {
      const file = await realFetch(`${base}/api/notes/n1/file`)
      expect(file.status).toBe(200)
      expect(await file.text()).toBe("%PDF")

      const download = await realFetch(`${base}/api/notes/n1/download`)
      expect(download.status).toBe(404)
    })
    expect(mocks.getNoteFile).toHaveBeenCalledWith("n1")
  })
})

describe("note file streaming", () => {
  it("never treats a conditional request for a public file as cacheable", async () => {
    const etag = fileEtag("notes/a.pdf", 42, updatedAt)

    await withServer(app(), async (base) => {
      const res = await realFetch(`${base}/api/notes/n1/file`, {
        headers: { "If-None-Match": etag },
      })
      expect(res.status).toBe(200)
      expect(await res.text()).toBe("%PDF")
      expect(res.headers.get("cache-control")).toBe("no-store, private")
      expect(res.headers.get("etag")).toBeNull()
    })
    expect(mocks.getObjectUrl).toHaveBeenCalledWith("notes/a.pdf")
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it("keeps public file responses uncacheable and always inline after the upstream succeeds", async () => {
    await withServer(app(), async (base) => {
      const res = await realFetch(`${base}/api/notes/n1/file`)
      expect(res.status).toBe(200)
      expect(await res.text()).toBe("%PDF")
      expect(res.headers.get("content-type")).toBe("application/pdf")
      expect(res.headers.get("cache-control")).toBe("no-store, private")
      expect(res.headers.get("etag")).toBeNull()
      expect(res.headers.get("content-length")).toBe("4")
      expect(res.headers.get("content-disposition")).toBe(
        'inline; filename="a.pdf"; filename*=UTF-8\'\'a.pdf',
      )
    })

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it("fully sanitizes the Content-Disposition filename", async () => {
    mocks.getNoteFile.mockResolvedValueOnce(noteFile({
      fileName: '../../evil "quoted";\r\nX-Injected: 1.pdf',
    }))

    await withServer(app(), async (base) => {
      const res = await realFetch(`${base}/api/notes/n1/file`)
      const disposition = res.headers.get("content-disposition") ?? ""
      expect(res.status).toBe(200)
      expect(disposition.startsWith('inline; filename="')).toBe(true)
      expect(disposition).toContain("filename*=UTF-8''")
      expect(disposition.match(/;/g)).toHaveLength(2)
      expect(disposition).not.toMatch(/(\.\.\/|:|\r|\n)/)
    })
  })

  it("percent-encodes RFC 6266 reserved characters in filename*", async () => {
    mocks.getNoteFile.mockResolvedValueOnce(noteFile({ fileName: "a*b(c)'d.pdf" }))

    await withServer(app(), async (base) => {
      const res = await realFetch(`${base}/api/notes/n1/file`)
      const disposition = res.headers.get("content-disposition") ?? ""
      const extended = disposition.split("filename*=UTF-8''")[1] ?? ""
      expect(res.status).toBe(200)
      expect(extended).toBe("a%2Ab%28c%29%27d.pdf")
    })
  })

  it("returns 503 for missing storage config and 404 for a missing note", async () => {
    mocks.getNoteFile.mockRejectedValueOnce(new ServiceUnavailableError())

    await withServer(app(), async (base) => {
      const unavailable = await realFetch(`${base}/api/notes/n1/file`)
      expect(unavailable.status).toBe(503)
      expect(unavailable.headers.get("cache-control")).toContain("no-store")
      expect(unavailable.headers.get("etag")).toBeNull()

      mocks.getNoteFile.mockRejectedValueOnce(new NotFoundError("Note not found"))
      const notFound = await realFetch(`${base}/api/notes/missing/file`)
      expect(notFound.status).toBe(404)
      expect(notFound.headers.get("cache-control")).toContain("no-store")
    })
  })

  it("maps an upstream 404 to a 404 and other failures to 502 without cache headers", async () => {
    await withServer(app(), async (base) => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(null, { status: 404 }))
      const missing = await realFetch(`${base}/api/notes/n1/file`)
      expect(missing.status).toBe(404)
      expect(missing.headers.get("cache-control")).toContain("no-store")
      expect(missing.headers.get("etag")).toBeNull()

      vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(null, { status: 502 }))
      const failed = await realFetch(`${base}/api/notes/n1/file`)
      expect(failed.status).toBe(502)
      expect(failed.headers.get("cache-control")).toContain("no-store")
      expect(failed.headers.get("etag")).toBeNull()
    })
  })

  it("refuses an oversized response from either the database or Content-Length", async () => {
    mocks.getNoteFile.mockResolvedValueOnce(noteFile({ fileSize: 26 * 1024 * 1024 }))

    await withServer(app(), async (base) => {
      const fromDb = await realFetch(`${base}/api/notes/n1/file`)
      expect(fromDb.status).toBe(413)
      expect(globalThis.fetch).not.toHaveBeenCalled()

      vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response("%PDF", {
        status: 200,
        headers: { "content-length": String(26 * 1024 * 1024) },
      }))
      const fromUpstream = await realFetch(`${base}/api/notes/n1/file`)
      expect(fromUpstream.status).toBe(413)
      expect(fromUpstream.headers.get("cache-control")).toContain("no-store")
    })
  })

  it("enforces the byte cap on an undeclared stream and never caches it", async () => {
    mocks.getNoteFile.mockResolvedValueOnce(noteFile({ fileSize: null }))
    process.env.NOTE_FILE_MAX_BYTES = "8"
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("0123456789"))
          controller.close()
        },
      }),
      { status: 200 },
    ))

    try {
      await withServer(app(), async (base) => {
        const res = await realFetch(`${base}/api/notes/n1/file`)
        expect(res.status).toBe(413)
        expect(res.headers.get("cache-control")).toContain("no-store")
        expect(res.headers.get("etag")).toBeNull()
      })
    } finally {
      delete process.env.NOTE_FILE_MAX_BYTES
    }
  })

  it("aborts the upstream fetch when the client disconnects", async () => {
    let closeUpstream!: () => void
    let upstreamSignal: AbortSignal | undefined
    let closed = false
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("%"))
        closeUpstream = () => {
          if (closed) return
          closed = true
          controller.close()
        }
      },
    })
    vi.mocked(globalThis.fetch).mockImplementation(async (_url, init) => {
      upstreamSignal = init?.signal as AbortSignal | undefined
      upstreamSignal?.addEventListener("abort", () => closeUpstream(), { once: true })
      return new Response(body, { status: 200 })
    })

    await withServer(app(), async (base) => {
      const client = new AbortController()
      const res = await realFetch(`${base}/api/notes/n1/file`, { signal: client.signal })
      expect(res.status).toBe(200)
      client.abort()
      await vi.waitFor(() => expect(upstreamSignal?.aborted).toBe(true))
      closeUpstream()
    })
  })

  it("handles an upstream stream error without taking down the server", async () => {
    let failed = false
    const broken = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (failed) return
        failed = true
        controller.enqueue(new TextEncoder().encode("%"))
        controller.error(new Error("upstream stream failed"))
      },
    })
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(new Response(broken, { status: 200 }))
      .mockResolvedValueOnce(new Response("%PDF", { status: 200 }))

    await withServer(app(), async (base) => {
      await realFetch(`${base}/api/notes/n1/file`).catch(() => undefined)
      await vi.waitFor(async () => {
        const healthy = await realFetch(`${base}/api/notes/n1/file`)
        expect(await healthy.text()).toBe("%PDF")
      })
    })
  })

  it("aborts the upstream fetch when the timeout expires", async () => {
    let upstreamSignal: AbortSignal | undefined
    let closeUpstream!: () => void
    let closed = false
    process.env.NOTE_FILE_TIMEOUT_MS = "30"
    vi.mocked(globalThis.fetch).mockImplementation(async (_url, init) => {
      upstreamSignal = init?.signal as AbortSignal | undefined
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("%"))
          closeUpstream = () => {
            if (closed) return
            closed = true
            controller.close()
          }
        },
      })
      upstreamSignal?.addEventListener("abort", () => closeUpstream(), { once: true })
      return new Response(body, { status: 200 })
    })

    try {
      await withServer(app(), async (base) => {
        await realFetch(`${base}/api/notes/n1/file`).catch(() => undefined)
        await vi.waitFor(() => expect(upstreamSignal?.aborted).toBe(true))
      })
    } finally {
      delete process.env.NOTE_FILE_TIMEOUT_MS
    }
  })
})
