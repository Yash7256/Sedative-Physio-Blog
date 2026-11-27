import { beforeEach, describe, expect, it, vi } from "vitest"

import { decodeCursor, DEFAULT_PAGE_SIZE } from "../../lib/pagination.js"

const mocks = vi.hoisted(() => ({
  note: { findFirst: vi.fn(), findMany: vi.fn() },
  r2Configured: vi.fn(),
  getObjectUrl: vi.fn(),
}))

vi.mock("../../lib/prisma.js", () => ({ prisma: mocks }))
vi.mock("../r2.js", () => ({
  r2Configured: mocks.r2Configured,
  getObjectUrl: mocks.getObjectUrl,
}))

import { ServiceUnavailableError } from "../../lib/errors.js"
import { NotFoundError } from "../../lib/errors.js"
import { getDownload, getNoteFile, listNotes } from "../service.js"

const createdAt = new Date("2026-02-01T00:00:00.000Z")
const updatedAt = new Date("2026-02-02T00:00:00.000Z")
const rows = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `n${index + 1}` }))

beforeEach(() => {
  mocks.note.findFirst.mockReset()
  mocks.note.findMany.mockReset()
  mocks.r2Configured.mockReset().mockReturnValue(true)
  mocks.getObjectUrl.mockReset().mockResolvedValue("https://example.test/note.pdf")
})

describe("listNotes cursor pagination", () => {
  it("only lists published, uploaded notes with a stable cursor order", async () => {
    mocks.note.findMany.mockResolvedValue(rows(DEFAULT_PAGE_SIZE))

    const page = await listNotes("notes", { limit: DEFAULT_PAGE_SIZE, cursorId: null })

    expect(mocks.note.findFirst).not.toHaveBeenCalled()
    expect(mocks.note.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isPublished: true, status: "UPLOADED", category: "notes" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: DEFAULT_PAGE_SIZE + 1,
    }))
    expect(page.items).toHaveLength(DEFAULT_PAGE_SIZE)
    expect(page.nextCursor).toBeNull()
  })

  it("uses the anchor timestamp and drops the lookahead row", async () => {
    mocks.note.findFirst.mockResolvedValue({ createdAt })
    mocks.note.findMany.mockResolvedValue(rows(DEFAULT_PAGE_SIZE + 1))

    const page = await listNotes(undefined, { limit: DEFAULT_PAGE_SIZE, cursorId: "cursor-note" })

    expect(mocks.note.findFirst).toHaveBeenCalledWith({
      where: { id: "cursor-note", isPublished: true, status: "UPLOADED" },
      select: { createdAt: true },
    })
    expect(mocks.note.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isPublished: true,
        status: "UPLOADED",
        OR: [
          { createdAt: { lt: createdAt } },
          { createdAt, id: { lt: "cursor-note" } },
        ],
      },
      take: DEFAULT_PAGE_SIZE + 1,
    }))
    expect(decodeCursor(page.nextCursor!)).toBe(`n${DEFAULT_PAGE_SIZE}`)
  })

  it("refuses a cursor for an unpublished or unuploaded note", async () => {
    mocks.note.findFirst.mockResolvedValue(null)

    await expect(listNotes(undefined, { limit: 12, cursorId: "gone" })).rejects.toThrow("Invalid cursor")
    expect(mocks.note.findMany).not.toHaveBeenCalled()
  })
})

describe("note file lookups", () => {
  it("requires a published, uploaded note for a download URL", async () => {
    mocks.note.findFirst.mockResolvedValue({ fileKey: "notes/a.pdf", fileName: "a.pdf" })

    await expect(getDownload("n1")).resolves.toEqual({
      fileName: "a.pdf",
      url: "https://example.test/note.pdf",
    })
    expect(mocks.note.findFirst).toHaveBeenCalledWith({
      where: { id: "n1", isPublished: true, status: "UPLOADED" },
      select: { fileKey: true, fileName: true },
    })
  })

  it("selects updatedAt so an overwrite invalidates the file ETag", async () => {
    mocks.note.findFirst.mockResolvedValue({
      fileKey: "notes/a.pdf",
      fileName: "a.pdf",
      fileSize: 42,
      updatedAt,
    })

    await expect(getNoteFile("n1")).resolves.toEqual({
      fileName: "a.pdf",
      fileKey: "notes/a.pdf",
      fileSize: 42,
      updatedAt,
    })
    expect(mocks.note.findFirst).toHaveBeenCalledWith({
      where: { id: "n1", isPublished: true, status: "UPLOADED" },
      select: { fileKey: true, fileName: true, fileSize: true, updatedAt: true },
    })
  })

  it("returns 503 when storage is not configured, with a generic message", async () => {
    mocks.r2Configured.mockReturnValue(false)
    mocks.note.findFirst.mockResolvedValue({ fileKey: "notes/a.pdf", fileName: "a.pdf" })

    for (const result of await Promise.allSettled([getDownload("n1"), getNoteFile("n1")])) {
      expect(result.status).toBe("rejected")
      const error = (result as PromiseRejectedResult).reason
      expect(error).toBeInstanceOf(ServiceUnavailableError)
      expect((error as ServiceUnavailableError).statusCode).toBe(503)
      expect((error as Error).message).not.toMatch(/R2_|\.env/)
    }
  })

  it("returns 404 for a note with no uploaded file", async () => {
    mocks.note.findFirst.mockResolvedValue({ fileKey: null, fileName: null, fileSize: null, updatedAt })

    for (const result of await Promise.allSettled([getDownload("n1"), getNoteFile("n1")])) {
      expect(result.status).toBe("rejected")
      const error = (result as PromiseRejectedResult).reason
      expect(error).toBeInstanceOf(NotFoundError)
      expect((error as NotFoundError).statusCode).toBe(404)
    }
  })
})
