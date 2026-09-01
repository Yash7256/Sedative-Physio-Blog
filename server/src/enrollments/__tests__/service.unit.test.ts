import { vi, describe, it, expect, beforeEach } from "vitest"

const {
  mockCourseFindFirst,
  mockCourseFindUnique,
  mockEnrollmentFindUnique,
  mockEnrollmentCreate,
  mockEnrollmentFindMany,
} = vi.hoisted(() => ({
  mockCourseFindFirst: vi.fn(),
  mockCourseFindUnique: vi.fn(),
  mockEnrollmentFindUnique: vi.fn(),
  mockEnrollmentCreate: vi.fn(),
  mockEnrollmentFindMany: vi.fn(),
}))

vi.mock("../../../generated/prisma/client.js", () => {
  class PrismaClientMock {
    course = { findFirst: mockCourseFindFirst, findUnique: mockCourseFindUnique }
    enrollment = {
      findUnique: mockEnrollmentFindUnique,
      create: mockEnrollmentCreate,
      findMany: mockEnrollmentFindMany,
    }
  }
  return { PrismaClient: PrismaClientMock }
})

vi.mock("@prisma/adapter-pg", () => {
  class PrismaPgMock {}
  return { PrismaPg: PrismaPgMock }
})

const { enrollFree, getEnrollmentStatus, listEnrollments, isEnrolled } =
  await import("../service.js")
const { BadRequestError, ConflictError, NotFoundError } =
  await import("../errors.js")

describe("enrollFree", () => {
  beforeEach(() => vi.clearAllMocks())

  it("throws ConflictError when enrollment already exists", async () => {
    mockCourseFindFirst.mockResolvedValue({ id: "c1", price: 0, isFree: true, isPublished: true })
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1" })
    await expect(enrollFree("user_1", "c1")).rejects.toThrow(ConflictError)
  })

  it("throws NotFoundError when course not found", async () => {
    mockCourseFindFirst.mockResolvedValue(null)
    await expect(enrollFree("user_1", "c1")).rejects.toThrow(NotFoundError)
  })

  it("throws BadRequestError when course is paid", async () => {
    mockCourseFindFirst.mockResolvedValue({ id: "c1", price: 50000, isFree: false, isPublished: true })
    await expect(enrollFree("user_1", "c1")).rejects.toThrow(BadRequestError)
  })

  it("returns enrollment details on success", async () => {
    const now = new Date()
    mockCourseFindFirst.mockResolvedValue({ id: "c1", price: 0, isFree: true, isPublished: true })
    mockEnrollmentFindUnique.mockResolvedValue(null)
    mockEnrollmentCreate.mockResolvedValue({
      id: "e1",
      courseId: "c1",
      clerkUserId: "user_1",
      source: "FREE",
      enrolledAt: now,
    })
    const result = await enrollFree("user_1", "c1")
    expect(result.enrollmentId).toBe("e1")
    expect(result.source).toBe("FREE")
    expect(result.enrolledAt).toBe(now.toISOString())
  })
})

describe("getEnrollmentStatus", () => {
  beforeEach(() => vi.clearAllMocks())

  it("throws NotFoundError when course does not exist", async () => {
    mockCourseFindUnique.mockResolvedValue(null)
    await expect(getEnrollmentStatus("user_1", "c_bad")).rejects.toThrow(NotFoundError)
  })

  it("returns enrolled: false when no enrollment", async () => {
    mockCourseFindUnique.mockResolvedValue({ id: "c1" })
    mockEnrollmentFindUnique.mockResolvedValue(null)
    const result = await getEnrollmentStatus("user_1", "c1")
    expect(result.enrolled).toBe(false)
  })

  it("returns enrolled: true with enrolledAt when enrolled", async () => {
    const now = new Date()
    mockCourseFindUnique.mockResolvedValue({ id: "c1" })
    mockEnrollmentFindUnique.mockResolvedValue({ enrolledAt: now })
    const result = await getEnrollmentStatus("user_1", "c1")
    expect(result.enrolled).toBe(true)
    expect(result.enrolledAt).toBe(now.toISOString())
  })
})

describe("listEnrollments", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns empty array when no enrollments", async () => {
    mockEnrollmentFindMany.mockResolvedValue([])
    const result = await listEnrollments("user_1")
    expect(result).toEqual([])
  })

  it("returns mapped enrollment list", async () => {
    const now = new Date()
    mockEnrollmentFindMany.mockResolvedValue([
      {
        courseId: "c1",
        enrolledAt: now,
        course: { title: "Test", slug: "test", thumbnail: null },
      },
    ])
    const result = await listEnrollments("user_1")
    expect(result[0]).toMatchObject({ courseId: "c1", title: "Test", slug: "test" })
  })
})

describe("isEnrolled", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns true when enrollment exists", async () => {
    mockEnrollmentFindUnique.mockResolvedValue({ id: "e1" })
    expect(await isEnrolled("user_1", "c1")).toBe(true)
  })

  it("returns false when no enrollment", async () => {
    mockEnrollmentFindUnique.mockResolvedValue(null)
    expect(await isEnrolled("user_1", "c1")).toBe(false)
  })
})
