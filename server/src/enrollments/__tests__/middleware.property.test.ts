/**
 * Property-based tests for middleware.ts (enrollmentGuard)
 * Feature: course-purchase-enrollment
 *
 * Tests preview bypass, access control, and courseId resolution.
 * All external dependencies (PrismaClient, @clerk/express) are mocked via vi.hoisted.
 */

import { vi, describe, it, expect, beforeEach } from "vitest"
import * as fc from "fast-check"

// ── Hoist mock functions ──────────────────────────────────────────────────────
const {
  mockLessonFindUnique,
  mockLessonFindFirst,
  mockEnrollmentFindUnique,
  mockGetAuth,
} = vi.hoisted(() => ({
  mockLessonFindUnique: vi.fn(),
  mockLessonFindFirst: vi.fn(),
  mockEnrollmentFindUnique: vi.fn(),
  mockGetAuth: vi.fn(),
}))

// ── Mock PrismaClient ─────────────────────────────────────────────────────────
vi.mock("../../../generated/prisma/client.js", () => {
  class PrismaClientMock {
    lesson = {
      findUnique: mockLessonFindUnique,
      findFirst: mockLessonFindFirst,
    }
    enrollment = { findUnique: mockEnrollmentFindUnique }
  }
  return { PrismaClient: PrismaClientMock }
})

// ── Mock @prisma/adapter-pg ───────────────────────────────────────────────────
vi.mock("@prisma/adapter-pg", () => {
  class PrismaPgMock {}
  return { PrismaPg: PrismaPgMock }
})

// ── Mock @clerk/express ───────────────────────────────────────────────────────
vi.mock("@clerk/express", () => ({
  getAuth: mockGetAuth,
  clerkMiddleware: vi.fn(),
}))

// ── Import SUT after mocks ────────────────────────────────────────────────────
const { enrollmentGuard } = await import("../middleware.js")

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(params: Record<string, string> = {}) {
  return { params }
}

function makeRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: unknown) {
      this.body = body
      return this
    },
  }
  return res
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const nonEmptyString = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0)

/** Lesson record with isPreview: true */
const previewLessonArb = (courseId: string) =>
  fc.record({
    isPreview: fc.constant(true),
    section: fc.constant({ courseId }),
  })

/** Lesson record with isPreview: false */
const nonPreviewLessonArb = (courseId: string) =>
  fc.record({
    isPreview: fc.constant(false),
    section: fc.constant({ courseId }),
  })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("middleware.ts — property-based tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── P10: Preview lesson bypass ────────────────────────────────────────────
  it(
    // Feature: course-purchase-enrollment, Property 10: Preview lesson bypass
    "P10: enrollmentGuard calls next() for any lesson with isPreview:true regardless of auth state",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          nonEmptyString, // lessonId
          nonEmptyString, // courseId
          fc.boolean(),   // authenticated or not
          async (lessonId, courseId, isAuthenticated) => {
            vi.clearAllMocks()

            // Lesson is a preview
            mockLessonFindUnique.mockResolvedValue({
              isPreview: true,
              section: { courseId },
            })

            // Auth state varies
            mockGetAuth.mockReturnValue(
              isAuthenticated ? { userId: `user_${lessonId.slice(0, 4)}` } : { userId: null },
            )
            // Enrollment might or might not exist (irrelevant for preview)
            mockEnrollmentFindUnique.mockResolvedValue(null)

            const req = makeReq({ lessonId })
            const res = makeRes()
            const next = vi.fn()

            await enrollmentGuard(req as never, res as never, next)

            // Must always call next() for preview lessons
            expect(next).toHaveBeenCalledTimes(1)
            expect(res.statusCode).toBe(200)
            // Auth check and enrollment check should not matter
            expect(mockEnrollmentFindUnique).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  // ── P11: Enrollment guard access control ─────────────────────────────────
  it(
    // Feature: course-purchase-enrollment, Property 11: Enrollment guard access control
    "P11: for any non-preview lesson, guard calls next() iff Enrollment exists, returns 403 otherwise",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          nonEmptyString, // lessonId
          nonEmptyString, // clerkUserId
          nonEmptyString, // courseId
          fc.boolean(),   // whether enrollment exists
          async (lessonId, clerkUserId, courseId, hasEnrollment) => {
            vi.clearAllMocks()

            // Non-preview lesson
            mockLessonFindUnique.mockResolvedValue({
              isPreview: false,
              section: { courseId },
            })

            // Authenticated user
            mockGetAuth.mockReturnValue({ userId: clerkUserId })

            if (hasEnrollment) {
              mockEnrollmentFindUnique.mockResolvedValue({
                id: "e1",
                clerkUserId,
                courseId,
              })
            } else {
              mockEnrollmentFindUnique.mockResolvedValue(null)
            }

            const req = makeReq({ lessonId })
            const res = makeRes()
            const next = vi.fn()

            await enrollmentGuard(req as never, res as never, next)

            if (hasEnrollment) {
              expect(next).toHaveBeenCalledTimes(1)
              expect(res.statusCode).toBe(200)
            } else {
              expect(next).not.toHaveBeenCalled()
              expect(res.statusCode).toBe(403)
            }
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  // ── P12: enrollmentGuard courseId resolution via relation chain ───────────
  it(
    // Feature: course-purchase-enrollment, Property 12: enrollmentGuard courseId resolution via lesson→section→course
    "P12: enrollmentGuard resolves the correct courseId from just the lessonId via section.courseId relation",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          nonEmptyString, // lessonId
          nonEmptyString, // clerkUserId
          nonEmptyString, // courseId (embedded in section relation)
          async (lessonId, clerkUserId, courseId) => {
            vi.clearAllMocks()

            // The lesson record carries the courseId via section.courseId
            mockLessonFindUnique.mockResolvedValue({
              isPreview: false,
              section: { courseId },
            })

            // Authenticated
            mockGetAuth.mockReturnValue({ userId: clerkUserId })
            // Enrolled — so we can reach the next() branch
            mockEnrollmentFindUnique.mockResolvedValue({ id: "e1", clerkUserId, courseId })

            const req = makeReq({ lessonId })
            const res = makeRes()
            const next = vi.fn()

            await enrollmentGuard(req as never, res as never, next)

            // Guard must have called next() (successful path)
            expect(next).toHaveBeenCalledTimes(1)

            // Verify the enrollment check used the correct courseId from the relation
            expect(mockEnrollmentFindUnique).toHaveBeenCalledWith(
              expect.objectContaining({
                where: expect.objectContaining({
                  clerkUserId_courseId: expect.objectContaining({
                    courseId,
                  }),
                }),
              }),
            )

            // Verify the lesson lookup used lessonId (not lessonSlug)
            expect(mockLessonFindUnique).toHaveBeenCalledWith(
              expect.objectContaining({
                where: { id: lessonId },
              }),
            )
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
