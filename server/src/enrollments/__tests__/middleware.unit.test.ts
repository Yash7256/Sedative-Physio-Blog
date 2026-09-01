import { vi, describe, it, expect, beforeEach } from "vitest"

const {
  mockLessonFindUnique,
  mockLessonFindFirst,
  mockEnrollmentFindUnique,
} = vi.hoisted(() => ({
  mockLessonFindUnique: vi.fn(),
  mockLessonFindFirst: vi.fn(),
  mockEnrollmentFindUnique: vi.fn(),
}))

vi.mock("../../../generated/prisma/client.js", () => {
  class PrismaClientMock {
    lesson = { findUnique: mockLessonFindUnique, findFirst: mockLessonFindFirst }
    enrollment = { findUnique: mockEnrollmentFindUnique }
  }
  return { PrismaClient: PrismaClientMock }
})

vi.mock("@prisma/adapter-pg", () => {
  class PrismaPgMock {}
  return { PrismaPg: PrismaPgMock }
})

vi.mock("@clerk/express", () => ({
  getAuth: vi.fn().mockReturnValue({ userId: null }),
  clerkMiddleware: vi.fn(),
}))

const { enrollmentGuard } = await import("../middleware.js")
const { getAuth } = await import("@clerk/express")

function makeReq(params: Record<string, string> = {}) {
  return { params } as never
}

function makeRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) { this.statusCode = code; return this },
    json(body: unknown) { this.body = body; return this },
  }
  return res
}

describe("enrollmentGuard", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 404 when lessonId does not exist", async () => {
    mockLessonFindUnique.mockResolvedValue(null)
    const res = makeRes()
    const next = vi.fn()
    await enrollmentGuard(makeReq({ lessonId: "bad_id" }), res as never, next)
    expect(res.statusCode).toBe(404)
    expect(next).not.toHaveBeenCalled()
  })

  it("calls next() immediately for preview lessons without auth check", async () => {
    mockLessonFindUnique.mockResolvedValue({
      isPreview: true,
      section: { courseId: "c1" },
    })
    const res = makeRes()
    const next = vi.fn()
    await enrollmentGuard(makeReq({ lessonId: "l1" }), res as never, next)
    expect(next).toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
  })

  it("returns 401 for non-preview lesson without auth", async () => {
    mockLessonFindUnique.mockResolvedValue({
      isPreview: false,
      section: { courseId: "c1" },
    })
    vi.mocked(getAuth).mockReturnValue({ userId: null } as never)
    const res = makeRes()
    const next = vi.fn()
    await enrollmentGuard(makeReq({ lessonId: "l1" }), res as never, next)
    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it("returns 403 when authenticated but not enrolled", async () => {
    mockLessonFindUnique.mockResolvedValue({
      isPreview: false,
      section: { courseId: "c1" },
    })
    vi.mocked(getAuth).mockReturnValue({ userId: "user_1" } as never)
    mockEnrollmentFindUnique.mockResolvedValue(null)
    const res = makeRes()
    const next = vi.fn()
    await enrollmentGuard(makeReq({ lessonId: "l1" }), res as never, next)
    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })

  it("calls next() when authenticated and enrolled", async () => {
    mockLessonFindUnique.mockResolvedValue({
      isPreview: false,
      section: { courseId: "c1" },
    })
    vi.mocked(getAuth).mockReturnValue({ userId: "user_1" } as never)
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1" })
    const res = makeRes()
    const next = vi.fn()
    await enrollmentGuard(makeReq({ lessonId: "l1" }), res as never, next)
    expect(next).toHaveBeenCalled()
  })
})
