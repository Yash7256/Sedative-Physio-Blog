/**
 * Property-based tests for service.ts
 * Feature: course-purchase-enrollment
 *
 * Tests enrollment round-trip, paid-course rejection, list ordering, and status correctness.
 * All external dependencies (PrismaClient) are mocked via vi.hoisted.
 */

import { vi, describe, it, expect, beforeEach } from "vitest"
import * as fc from "fast-check"

// ── Hoist mock functions ──────────────────────────────────────────────────────
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

// ── Mock PrismaClient ─────────────────────────────────────────────────────────
vi.mock("../../../generated/prisma/client.js", () => {
  class PrismaClientMock {
    course = {
      findFirst: mockCourseFindFirst,
      findUnique: mockCourseFindUnique,
    }
    enrollment = {
      findUnique: mockEnrollmentFindUnique,
      create: mockEnrollmentCreate,
      findMany: mockEnrollmentFindMany,
    }
  }
  return { PrismaClient: PrismaClientMock }
})

// ── Mock @prisma/adapter-pg ───────────────────────────────────────────────────
vi.mock("@prisma/adapter-pg", () => {
  class PrismaPgMock {}
  return { PrismaPg: PrismaPgMock }
})

// ── Import SUT after mocks ────────────────────────────────────────────────────
const { enrollFree, listEnrollments, getEnrollmentStatus } =
  await import("../service.js")
const { BadRequestError } = await import("../errors.js")

// ── Arbitraries ───────────────────────────────────────────────────────────────

const nonEmptyString = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0)

/** Free course: price === 0, isFree === true */
const freeCourseArb = fc.record({
  id: nonEmptyString,
  title: fc.string(),
  slug: fc.string(),
  isPublished: fc.constant(true),
  isFree: fc.constant(true),
  price: fc.constant(0),
})

/** Paid course: price > 0, isFree === false */
const paidCourseArb = fc.record({
  id: nonEmptyString,
  title: fc.string(),
  slug: fc.string(),
  isPublished: fc.constant(true),
  isFree: fc.constant(false),
  price: fc.integer({ min: 1, max: 10_000_000 }),
})

/** A single enrollment record with all required fields for listEnrollments.
 *  We use integer timestamps (ms since epoch) to avoid fast-check generating
 *  Date(NaN) edge cases, then convert to Date objects. */
const enrollmentRecordArb = fc
  .record({
    courseId: nonEmptyString,
    enrolledAtMs: fc.integer({
      min: new Date("2020-01-01").getTime(),
      max: new Date("2030-12-31").getTime(),
    }),
    course: fc.record({
      title: fc.string(),
      slug: fc.string(),
      thumbnail: fc.option(fc.string(), { nil: null }),
    }),
  })
  .map(({ courseId, enrolledAtMs, course }) => ({
    courseId,
    enrolledAt: new Date(enrolledAtMs),
    course,
  }))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("service.ts — property-based tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── P1: Free-course enrollment round-trip ─────────────────────────────────
  it(
    // Feature: course-purchase-enrollment, Property 1: Free-course enrollment round-trip
    "P1: enrollFree creates an Enrollment with source FREE, correct clerkUserId/courseId, and valid ISO 8601 enrolledAt",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          nonEmptyString, // clerkUserId
          freeCourseArb,  // free course
          async (clerkUserId, course) => {
            vi.clearAllMocks()

            const enrolledAt = new Date()
            const enrollmentId = `enroll_${clerkUserId.slice(0, 4)}`

            mockCourseFindFirst.mockResolvedValue(course)
            mockEnrollmentFindUnique.mockResolvedValue(null)
            mockEnrollmentCreate.mockResolvedValue({
              id: enrollmentId,
              courseId: course.id,
              clerkUserId,
              source: "FREE",
              enrolledAt,
            })

            const result = await enrollFree(clerkUserId, course.id)

            // Verify correct fields
            expect(result.enrollmentId).toBe(enrollmentId)
            expect(result.courseId).toBe(course.id)
            expect(result.clerkUserId).toBe(clerkUserId)
            expect(result.source).toBe("FREE")

            // Verify valid ISO 8601 enrolledAt
            const parsedDate = new Date(result.enrolledAt)
            expect(parsedDate instanceof Date).toBe(true)
            expect(isNaN(parsedDate.getTime())).toBe(false)
            // ISO 8601 format check: should contain 'T' separator
            expect(result.enrolledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)

            // Verify enrollment.create was called with correct data
            expect(mockEnrollmentCreate).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  clerkUserId,
                  courseId: course.id,
                  source: "FREE",
                }),
              }),
            )
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  // ── P2: Paid-course free-enrollment rejection ─────────────────────────────
  it(
    // Feature: course-purchase-enrollment, Property 2: Paid-course free-enrollment rejection
    "P2: enrollFree throws BadRequestError for any course with price > 0 and isFree: false",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          nonEmptyString, // clerkUserId
          paidCourseArb,  // paid course
          async (clerkUserId, course) => {
            vi.clearAllMocks()

            mockCourseFindFirst.mockResolvedValue(course)

            await expect(enrollFree(clerkUserId, course.id)).rejects.toThrow(
              BadRequestError,
            )

            // No enrollment record should be created
            expect(mockEnrollmentCreate).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  // ── P13: Enrollment list ordering and completeness ────────────────────────
  it(
    // Feature: course-purchase-enrollment, Property 13: Enrollment list ordering and completeness
    "P13: listEnrollments returns records sorted by enrolledAt descending with required fields and at most 500",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          nonEmptyString,                                          // clerkUserId
          fc.array(enrollmentRecordArb, { minLength: 0, maxLength: 10 }), // up to 10 records
          async (clerkUserId, rawRecords) => {
            vi.clearAllMocks()

            // Sort descending by enrolledAt (simulating what Prisma returns after orderBy+take:500)
            const sorted = [...rawRecords].sort(
              (a, b) => b.enrolledAt.getTime() - a.enrolledAt.getTime(),
            )

            mockEnrollmentFindMany.mockResolvedValue(sorted)

            const result = await listEnrollments(clerkUserId)

            // At most 500 records
            expect(result.length).toBeLessThanOrEqual(500)
            // Same count as input (we capped at 10 in generator, well under 500)
            expect(result.length).toBe(sorted.length)

            // All required fields present
            for (const item of result) {
              expect(item).toHaveProperty("courseId")
              expect(item).toHaveProperty("title")
              expect(item).toHaveProperty("slug")
              expect(item).toHaveProperty("thumbnail") // nullable but present
              expect(item).toHaveProperty("enrolledAt")
              // enrolledAt must be a valid ISO 8601 string
              const d = new Date(item.enrolledAt)
              expect(isNaN(d.getTime())).toBe(false)
              expect(item.enrolledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
            }

            // Sorted descending by enrolledAt
            for (let i = 1; i < result.length; i++) {
              const prev = new Date(result[i - 1]!.enrolledAt).getTime()
              const curr = new Date(result[i]!.enrolledAt).getTime()
              expect(prev).toBeGreaterThanOrEqual(curr)
            }
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  // ── P14: Enrollment status correctness ───────────────────────────────────
  it(
    // Feature: course-purchase-enrollment, Property 14: Enrollment status correctness
    "P14: getEnrollmentStatus returns enrolled:true iff Enrollment exists, enrolled:false otherwise",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          nonEmptyString,  // clerkUserId
          nonEmptyString,  // courseId
          fc.boolean(),    // whether enrollment exists
          async (clerkUserId, courseId, hasEnrollment) => {
            vi.clearAllMocks()

            const enrolledAt = new Date()

            // Course always exists for this property
            mockCourseFindUnique.mockResolvedValue({ id: courseId })

            if (hasEnrollment) {
              mockEnrollmentFindUnique.mockResolvedValue({
                id: "e1",
                clerkUserId,
                courseId,
                enrolledAt,
              })
            } else {
              mockEnrollmentFindUnique.mockResolvedValue(null)
            }

            const result = await getEnrollmentStatus(clerkUserId, courseId)

            if (hasEnrollment) {
              expect(result.enrolled).toBe(true)
              // enrolledAt must be present and valid ISO 8601
              expect(result.enrolledAt).toBeDefined()
              const d = new Date(result.enrolledAt!)
              expect(isNaN(d.getTime())).toBe(false)
              expect(result.enrolledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
            } else {
              expect(result.enrolled).toBe(false)
              // enrolledAt must NOT be present when not enrolled
              expect(result.enrolledAt).toBeUndefined()
            }
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
