/**
 * Unit tests for createOrder (payment.ts)
 *
 * All external dependencies (PrismaClient, @prisma/adapter-pg, razorpay) are
 * mocked via vi.mock so no real DB or network calls are made.
 */

import { vi, describe, it, expect, beforeEach } from "vitest"

// ── Hoist mock functions so they're available inside vi.mock factories ────────
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
// Dynamic import ensures mocks are in place before module-level code runs.
const { createOrder } = await import("../payment.js")
const { BadRequestError, NotFoundError, ConflictError, GatewayError } =
  await import("../errors.js")

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: "course-123",
    title: "Test Course",
    isPublished: true,
    isFree: false,
    price: 49900, // 499 INR in paise
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("createOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 1. Empty courseId → BadRequestError ──────────────────────────────────
  it("throws BadRequestError when courseId is empty string", async () => {
    await expect(
      createOrder({ clerkUserId: "user_abc", courseId: "" }),
    ).rejects.toThrow(BadRequestError)
  })

  it("throws BadRequestError when courseId is only whitespace", async () => {
    await expect(
      createOrder({ clerkUserId: "user_abc", courseId: "   " }),
    ).rejects.toThrow(BadRequestError)
  })

  // ── 2. Course not found → NotFoundError ──────────────────────────────────
  it("throws NotFoundError when course does not exist", async () => {
    mockCoursesFindFirst.mockResolvedValue(null)

    await expect(
      createOrder({ clerkUserId: "user_abc", courseId: "course-does-not-exist" }),
    ).rejects.toThrow(NotFoundError)
  })

  // ── 3. Free course → BadRequestError ─────────────────────────────────────
  it("throws BadRequestError when course is free (isFree=true)", async () => {
    mockCoursesFindFirst.mockResolvedValue(makeCourse({ isFree: true, price: 0 }))

    await expect(
      createOrder({ clerkUserId: "user_abc", courseId: "course-123" }),
    ).rejects.toThrow(BadRequestError)
  })

  it("throws BadRequestError when course price is 0 (isFree=false but price=0)", async () => {
    mockCoursesFindFirst.mockResolvedValue(makeCourse({ isFree: false, price: 0 }))

    await expect(
      createOrder({ clerkUserId: "user_abc", courseId: "course-123" }),
    ).rejects.toThrow(BadRequestError)
  })

  // ── 4. Already enrolled → ConflictError ──────────────────────────────────
  it("throws ConflictError when user is already enrolled", async () => {
    mockCoursesFindFirst.mockResolvedValue(makeCourse())
    mockEnrollmentFindUnique.mockResolvedValue({ id: "enroll-999" })

    await expect(
      createOrder({ clerkUserId: "user_abc", courseId: "course-123" }),
    ).rejects.toThrow(ConflictError)
  })

  // ── 5. Razorpay SDK throws → GatewayError ────────────────────────────────
  it("throws GatewayError when Razorpay SDK rejects", async () => {
    mockCoursesFindFirst.mockResolvedValue(makeCourse())
    mockEnrollmentFindUnique.mockResolvedValue(null)
    mockOrderFindFirst.mockResolvedValue(null)
    mockOrdersCreate.mockRejectedValue(new Error("Razorpay network error"))

    await expect(
      createOrder({ clerkUserId: "user_abc", courseId: "course-123" }),
    ).rejects.toThrow(GatewayError)
  })
})
