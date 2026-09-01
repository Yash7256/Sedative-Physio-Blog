/**
 * Property-based tests for createOrder (payment.ts)
 * Feature: course-purchase-enrollment
 *
 * Uses fast-check to verify universal invariants across many inputs.
 * All external dependencies (PrismaClient, Razorpay) are mocked via vi.hoisted.
 */

import { vi, describe, it, expect, beforeEach } from "vitest"
import * as fc from "fast-check"

// ── Hoist mock functions ──────────────────────────────────────────────────────
const {
  mockCoursesFindFirst,
  mockEnrollmentFindUnique,
  mockOrderFindFirst,
  mockOrderCreate,
  mockOrdersCreate,
} = vi.hoisted(() => ({
  mockCoursesFindFirst: vi.fn(),
  mockEnrollmentFindUnique: vi.fn(),
  mockOrderFindFirst: vi.fn(),
  mockOrderCreate: vi.fn(),
  mockOrdersCreate: vi.fn(),
}))

// ── Mock PrismaClient ─────────────────────────────────────────────────────────
vi.mock("../../../generated/prisma/client.js", () => {
  class PrismaClientMock {
    course = { findFirst: mockCoursesFindFirst }
    enrollment = { findUnique: mockEnrollmentFindUnique }
    order = { findFirst: mockOrderFindFirst, create: mockOrderCreate }
  }
  return { PrismaClient: PrismaClientMock }
})

// ── Mock @prisma/adapter-pg ───────────────────────────────────────────────────
vi.mock("@prisma/adapter-pg", () => {
  class PrismaPgMock {}
  return { PrismaPg: PrismaPgMock }
})

// ── Mock razorpay ─────────────────────────────────────────────────────────────
vi.mock("razorpay", () => {
  class RazorpayMock {
    orders = { create: mockOrdersCreate }
  }
  return { default: RazorpayMock }
})

// ── Import SUT after mocks ────────────────────────────────────────────────────
const { createOrder } = await import("../payment.js")
const { BadRequestError } = await import("../errors.js")

// ── Arbitraries ───────────────────────────────────────────────────────────────

/** Non-empty string (no whitespace-only) */
const nonEmptyString = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0)

/** Paid course record: price > 0, isFree: false */
const paidCourseArb = fc.record({
  id: nonEmptyString,
  title: fc.string(),
  isPublished: fc.constant(true),
  isFree: fc.constant(false),
  price: fc.integer({ min: 1, max: 10_000_000 }),
})

/** Free course record: isFree === true AND price === 0 */
const freeCourseIsFreeArb = fc.record({
  id: nonEmptyString,
  title: fc.string(),
  isPublished: fc.constant(true),
  isFree: fc.constant(true),
  price: fc.constant(0),
})

/** "Inconsistently free" course: price === 0 but isFree might be false */
const freeCourseZeroPriceArb = fc.record({
  id: nonEmptyString,
  title: fc.string(),
  isPublished: fc.constant(true),
  isFree: fc.boolean(),
  price: fc.constant(0),
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("payment.ts — property-based tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── P3: Order creation persists a PENDING record ──────────────────────────
  it(
    // Feature: course-purchase-enrollment, Property 3: Order creation persists a PENDING record
    "P3: createOrder persists an Order with PENDING status, correct amount, and currency INR for any paid course",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          nonEmptyString,         // clerkUserId
          nonEmptyString,         // courseId
          paidCourseArb,          // course
          async (clerkUserId, courseId, course) => {
            vi.clearAllMocks()

            const razorpayOrderId = `order_${courseId.slice(0, 8)}`

            mockCoursesFindFirst.mockResolvedValue({ ...course, id: courseId })
            mockEnrollmentFindUnique.mockResolvedValue(null)
            mockOrderFindFirst.mockResolvedValue(null)
            mockOrdersCreate.mockResolvedValue({
              id: razorpayOrderId,
              amount: course.price,
              currency: "INR",
            })
            mockOrderCreate.mockResolvedValue({
              id: "db-order-id",
              clerkUserId,
              courseId,
              razorpayOrderId,
              amount: course.price,
              currency: "INR",
              status: "PENDING",
            })

            const result = await createOrder({ clerkUserId, courseId })

            // Verify Razorpay order was created
            expect(mockOrdersCreate).toHaveBeenCalledWith(
              expect.objectContaining({
                amount: course.price,
                currency: "INR",
              }),
            )

            // Verify DB record was persisted with PENDING status
            expect(mockOrderCreate).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  clerkUserId,
                  courseId,
                  status: "PENDING",
                  amount: course.price,
                  currency: "INR",
                }),
              }),
            )

            // Verify result fields
            expect(result.orderId).toBe(razorpayOrderId)
            expect(result.amount).toBe(course.price)
            expect(result.currency).toBe("INR")
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  // ── P4: Free-course order creation rejection ──────────────────────────────
  it(
    // Feature: course-purchase-enrollment, Property 4: Free-course order creation rejection
    "P4: createOrder throws BadRequestError for any free course (isFree=true or price===0)",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          nonEmptyString, // clerkUserId
          nonEmptyString, // courseId
          fc.oneof(freeCourseIsFreeArb, freeCourseZeroPriceArb), // free course
          async (clerkUserId, courseId, course) => {
            vi.clearAllMocks()

            mockCoursesFindFirst.mockResolvedValue({ ...course, id: courseId })
            mockEnrollmentFindUnique.mockResolvedValue(null)

            await expect(createOrder({ clerkUserId, courseId })).rejects.toThrow(
              BadRequestError,
            )

            // No DB order record should be created
            expect(mockOrderCreate).not.toHaveBeenCalled()
            // No Razorpay order should be created
            expect(mockOrdersCreate).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  // ── P5: Duplicate pending order idempotency ───────────────────────────────
  it(
    // Feature: course-purchase-enrollment, Property 5: Duplicate pending order idempotency
    "P5: createOrder returns the same razorpayOrderId for any pair with an existing PENDING order",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          nonEmptyString, // clerkUserId
          nonEmptyString, // courseId
          paidCourseArb,  // paid course
          nonEmptyString, // existing razorpayOrderId
          async (clerkUserId, courseId, course, existingRazorpayOrderId) => {
            vi.clearAllMocks()

            const existingOrder = {
              id: "existing-db-id",
              clerkUserId,
              courseId,
              razorpayOrderId: existingRazorpayOrderId,
              amount: course.price,
              currency: "INR",
              status: "PENDING",
            }

            mockCoursesFindFirst.mockResolvedValue({ ...course, id: courseId })
            mockEnrollmentFindUnique.mockResolvedValue(null)
            mockOrderFindFirst.mockResolvedValue(existingOrder)

            const result = await createOrder({ clerkUserId, courseId })

            // Should return the existing orderId
            expect(result.orderId).toBe(existingRazorpayOrderId)
            expect(result.amount).toBe(course.price)
            expect(result.currency).toBe("INR")

            // No new DB record should be created
            expect(mockOrderCreate).not.toHaveBeenCalled()
            // Razorpay API should NOT be called
            expect(mockOrdersCreate).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  // ── P15: Price/isFree consistency invariant ───────────────────────────────
  it(
    // Feature: course-purchase-enrollment, Property 15: Price/isFree consistency invariant
    "P15: isFree === (price === 0) must always be true — createOrder rejects any course where isFree=true with price>0",
    async () => {
      await fc.assert(
        fc.asyncProperty(
          nonEmptyString,                      // clerkUserId
          nonEmptyString,                      // courseId
          fc.integer({ min: 0 }),              // price (can be 0 or positive)
          async (clerkUserId, courseId, price) => {
            vi.clearAllMocks()

            const isFreeCorrect = price === 0

            // A course that correctly satisfies the invariant
            const correctCourse = {
              id: courseId,
              title: "Test",
              isPublished: true,
              price,
              isFree: isFreeCorrect,
            }

            if (price === 0) {
              // Free course: createOrder should throw BadRequestError
              mockCoursesFindFirst.mockResolvedValue(correctCourse)
              mockEnrollmentFindUnique.mockResolvedValue(null)

              await expect(createOrder({ clerkUserId, courseId })).rejects.toThrow(
                BadRequestError,
              )
              expect(mockOrderCreate).not.toHaveBeenCalled()
            } else {
              // Paid course: createOrder should succeed (with mocked Razorpay)
              const razorpayOrderId = `order_test_${price}`
              mockCoursesFindFirst.mockResolvedValue(correctCourse)
              mockEnrollmentFindUnique.mockResolvedValue(null)
              mockOrderFindFirst.mockResolvedValue(null)
              mockOrdersCreate.mockResolvedValue({
                id: razorpayOrderId,
                amount: price,
                currency: "INR",
              })
              mockOrderCreate.mockResolvedValue({
                id: "db-id",
                clerkUserId,
                courseId,
                razorpayOrderId,
                amount: price,
                currency: "INR",
                status: "PENDING",
              })

              const result = await createOrder({ clerkUserId, courseId })
              expect(result.currency).toBe("INR")
              expect(result.amount).toBe(price)

              // The persisted record must also reflect isFree === (price === 0)
              // i.e., when price > 0, isFree must be false for a record to be created
              const createCall = mockOrderCreate.mock.calls[0]![0]
              expect(createCall.data.amount).toBe(price)
            }

            // In both cases: the invariant isFree === (price === 0) must hold
            // We verify the service rejects any invalid combination
            // Test with isFree: true but price > 0 (invariant violation)
            if (price > 0) {
              vi.clearAllMocks()
              const brokenCourse = {
                id: courseId,
                title: "Broken",
                isPublished: true,
                price,
                isFree: true, // WRONG: price > 0 but isFree is true
              }
              mockCoursesFindFirst.mockResolvedValue(brokenCourse)
              mockEnrollmentFindUnique.mockResolvedValue(null)

              // createOrder checks isFree first — a course with isFree:true should be rejected
              await expect(createOrder({ clerkUserId, courseId })).rejects.toThrow(
                BadRequestError,
              )
            }
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
