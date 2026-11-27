import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  model3D: { findMany: vi.fn(), findFirst: vi.fn() },
}))

vi.mock("../../lib/prisma.js", () => ({ prisma: prismaMock }))

import { BadRequestError } from "../../lib/errors.js"
import { decodeCursor, DEFAULT_PAGE_SIZE } from "../../lib/pagination.js"
import { listModels } from "../service.js"

const createdAt = new Date("2026-01-01T00:00:00.000Z")
const rows = (count: number) => Array.from({ length: count }, (_, index) => ({
  id: `m${index + 1}`,
  createdAt,
}))

beforeEach(() => {
  prismaMock.model3D.findMany.mockReset()
  prismaMock.model3D.findFirst.mockReset()
})

describe("listModels cursor pagination", () => {
  it("takes limit+1 in stable order and returns a null cursor on the last page", async () => {
    prismaMock.model3D.findMany.mockResolvedValue(rows(DEFAULT_PAGE_SIZE))

    const page = await listModels({ limit: DEFAULT_PAGE_SIZE, cursorId: null })

    expect(prismaMock.model3D.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {},
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: DEFAULT_PAGE_SIZE + 1,
    }))
    expect(page.items).toHaveLength(DEFAULT_PAGE_SIZE)
    expect(page.nextCursor).toBeNull()
  })

  it("uses a self-contained cursor without reading the cursor row again", async () => {
    prismaMock.model3D.findMany.mockResolvedValue(rows(DEFAULT_PAGE_SIZE + 1))

    const page = await listModels({
      limit: DEFAULT_PAGE_SIZE,
      cursorId: "cursor-model",
      cursorCreatedAt: createdAt,
    })

    expect(prismaMock.model3D.findFirst).not.toHaveBeenCalled()
    expect(prismaMock.model3D.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { createdAt: { lt: createdAt } },
          { createdAt, id: { lt: "cursor-model" } },
        ],
      },
      take: DEFAULT_PAGE_SIZE + 1,
    }))
    expect(decodeCursor(page.nextCursor!)).toEqual({ id: `m${DEFAULT_PAGE_SIZE}`, createdAt })
  })

  it("still resolves a legacy id-only cursor through its row", async () => {
    prismaMock.model3D.findFirst.mockResolvedValue({ createdAt })
    prismaMock.model3D.findMany.mockResolvedValue(rows(DEFAULT_PAGE_SIZE))

    await listModels({ limit: DEFAULT_PAGE_SIZE, cursorId: "legacy-model" })

    expect(prismaMock.model3D.findFirst).toHaveBeenCalledWith({
      where: { id: "legacy-model" },
      select: { createdAt: true },
    })
  })

  it("rejects a legacy cursor whose row no longer exists", async () => {
    prismaMock.model3D.findFirst.mockResolvedValue(null)

    await expect(listModels({ limit: 12, cursorId: "gone" })).rejects.toBeInstanceOf(BadRequestError)
    expect(prismaMock.model3D.findMany).not.toHaveBeenCalled()
  })
})
