import { beforeEach, describe, expect, it, vi } from "vitest"

import { BadRequestError } from "../../lib/errors.js"
import { decodeCursor, DEFAULT_PAGE_SIZE } from "../../lib/pagination.js"

const prismaMock = vi.hoisted(() => ({
  course: { findMany: vi.fn(), findFirst: vi.fn() },
}))

vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }))

import { listCourses } from "../service.js"

const createdAt = new Date("2026-01-01T00:00:00.000Z")
const rows = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `c${index + 1}` }))

beforeEach(() => {
  prismaMock.course.findMany.mockReset()
  prismaMock.course.findFirst.mockReset()
})

describe("listCourses cursor pagination", () => {
  it("takes limit+1 in stable createdAt/id order and returns null cursor on the last page", async () => {
    prismaMock.course.findMany.mockResolvedValue(rows(DEFAULT_PAGE_SIZE))

    const page = await listCourses({ limit: DEFAULT_PAGE_SIZE, cursorId: null })

    expect(prismaMock.course.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isPublished: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: DEFAULT_PAGE_SIZE + 1,
    }))
    expect(page.items).toHaveLength(DEFAULT_PAGE_SIZE)
    expect(page.nextCursor).toBeNull()
  })

  it("uses the cursor row's timestamp to break ties, and drops the lookahead item", async () => {
    prismaMock.course.findFirst.mockResolvedValue({ createdAt })
    prismaMock.course.findMany.mockResolvedValue(rows(DEFAULT_PAGE_SIZE + 1))

    const page = await listCourses({ limit: DEFAULT_PAGE_SIZE, cursorId: "cursor-course" })

    expect(prismaMock.course.findFirst).toHaveBeenCalledWith({
      where: { id: "cursor-course", isPublished: true },
      select: { createdAt: true },
    })
    expect(prismaMock.course.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isPublished: true,
        OR: [
          { createdAt: { lt: createdAt } },
          { createdAt, id: { lt: "cursor-course" } },
        ],
      },
      take: DEFAULT_PAGE_SIZE + 1,
    }))
    expect(page.items).toHaveLength(DEFAULT_PAGE_SIZE)
    expect(decodeCursor(page.nextCursor!)).toBe(`c${DEFAULT_PAGE_SIZE}`)
  })

  it("rejects a cursor whose row is no longer published", async () => {
    prismaMock.course.findFirst.mockResolvedValue(null)

    await expect(listCourses({ limit: 12, cursorId: "gone" })).rejects.toBeInstanceOf(BadRequestError)
    expect(prismaMock.course.findMany).not.toHaveBeenCalled()
  })
})
