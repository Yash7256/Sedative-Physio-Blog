import { beforeEach, describe, expect, it, vi } from "vitest"

import { BadRequestError, ConflictError, ServiceUnavailableError } from "../../lib/errors.js"
import { decodeCursor, DEFAULT_PAGE_SIZE } from "../../lib/pagination.js"

const prismaMock = vi.hoisted(() => ({
  course: { findMany: vi.fn(), findFirst: vi.fn() },
}))

vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }))

import {
  getCourseBySlug,
  listCourses,
  MAX_DETAIL_LESSONS_PER_SECTION,
  MAX_DETAIL_LESSONS_TOTAL,
  MAX_DETAIL_SECTIONS,
} from "../service.js"

const createdAt = new Date("2026-01-01T00:00:00.000Z")
const rows = (count: number) => Array.from({ length: count }, (_, index) => ({
  id: `c${index + 1}`,
  createdAt,
  isFree: true,
  price: 0,
}))

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
    expect(page.items[0]).not.toHaveProperty("createdAt")
    expect(page.nextCursor).toBeNull()
  })

  it("uses a self-contained cursor without reading the cursor row again", async () => {
    prismaMock.course.findMany.mockResolvedValue(rows(DEFAULT_PAGE_SIZE + 1))

    const page = await listCourses({
      limit: DEFAULT_PAGE_SIZE,
      cursorId: "cursor-course",
      cursorCreatedAt: createdAt,
    })

    expect(prismaMock.course.findFirst).not.toHaveBeenCalled()
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
    expect(decodeCursor(page.nextCursor!)).toEqual({ id: `c${DEFAULT_PAGE_SIZE}`, createdAt })
  })

  it("still resolves a legacy id-only cursor through its row", async () => {
    prismaMock.course.findFirst.mockResolvedValue({ createdAt })
    prismaMock.course.findMany.mockResolvedValue(rows(DEFAULT_PAGE_SIZE))

    const page = await listCourses({ limit: DEFAULT_PAGE_SIZE, cursorId: "legacy-course" })

    expect(prismaMock.course.findFirst).toHaveBeenCalledWith({
      where: { id: "legacy-course", isPublished: true },
      select: { createdAt: true },
    })
    expect(prismaMock.course.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isPublished: true,
        OR: [
          { createdAt: { lt: createdAt } },
          { createdAt, id: { lt: "legacy-course" } },
        ],
      },
    }))
    expect(page.items).toHaveLength(DEFAULT_PAGE_SIZE)
  })

  it("rejects a legacy cursor whose row is no longer published", async () => {
    prismaMock.course.findFirst.mockResolvedValue(null)

    await expect(listCourses({ limit: 12, cursorId: "gone" })).rejects
      .toBeInstanceOf(BadRequestError)
    expect(prismaMock.course.findMany).not.toHaveBeenCalled()
  })

  it("refuses to publish a course with inconsistent pricing", async () => {
    prismaMock.course.findMany.mockResolvedValue([{ id: "bad", isFree: true, price: 500 }])

    await expect(listCourses({ limit: 12, cursorId: null })).rejects.toBeInstanceOf(ConflictError)
  })

  it("fails closed with a generic 503 when the DB read exceeds the deadline", async () => {
    const original = process.env.CATALOG_DB_TIMEOUT_MS
    process.env.CATALOG_DB_TIMEOUT_MS = "5"
    try {
      prismaMock.course.findMany.mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(rows(1)), 40)))

      const error = await listCourses({ limit: 12, cursorId: null }).catch((err: unknown) => err)

      expect(error).toBeInstanceOf(ServiceUnavailableError)
      expect((error as Error).message).toBe("Catalog data is temporarily unavailable.")
    } finally {
      if (original === undefined) delete process.env.CATALOG_DB_TIMEOUT_MS
      else process.env.CATALOG_DB_TIMEOUT_MS = original
    }
  })
})

describe("getCourseBySlug payload bounds", () => {
  it("bounds sections, lessons per section and the total lesson count", async () => {
    const sections = Array.from({ length: MAX_DETAIL_SECTIONS + 3 }, (_, sectionIndex) => ({
      id: `s${sectionIndex}`,
      title: `Section ${sectionIndex}`,
      description: null,
      order: sectionIndex,
      lessons: Array.from({ length: MAX_DETAIL_LESSONS_PER_SECTION + 2 }, (_, lessonIndex) => ({
        id: `l${sectionIndex}-${lessonIndex}`,
        title: `Lesson ${lessonIndex}`,
        slug: `lesson-${lessonIndex}`,
        type: "VIDEO",
        duration: 10,
        isPreview: false,
      })),
    }))
    prismaMock.course.findFirst.mockResolvedValue({
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
      sections,
    })

    const detail = await getCourseBySlug("course")

    expect(prismaMock.course.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        sections: expect.objectContaining({
          take: MAX_DETAIL_SECTIONS,
          select: expect.objectContaining({
            lessons: expect.objectContaining({
              where: { isPublished: true },
              take: MAX_DETAIL_LESSONS_PER_SECTION,
            }),
          }),
        }),
      }),
    }))
    expect(detail?.sections).toHaveLength(MAX_DETAIL_SECTIONS)
    expect(detail?.sections.reduce((total, section) => total + section.lessons.length, 0)).toBe(MAX_DETAIL_LESSONS_TOTAL)
  })

  it("still returns null for an unknown published course", async () => {
    prismaMock.course.findFirst.mockResolvedValue(null)

    await expect(getCourseBySlug("missing")).resolves.toBeNull()
  })
})
