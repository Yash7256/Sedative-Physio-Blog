/**
 * Property-based tests for webhook.ts
 * Feature: course-purchase-enrollment
 *
 * Tests HMAC verification, atomic transaction, and idempotency properties.
 * All external dependencies (PrismaClient) are mocked via vi.hoisted.
 */

import { vi, describe, it, expect, beforeEach } from "vitest"
import * as fc from "fast-check"
import crypto from "node:crypto"

// ── Hoist mock functions ──────────────────────────────────────────────────────
const {
  mockOrderFindUnique,
  mockOrderUpdate,
  mockEnrollmentCreate,
  mockTransaction,
} = vi.hoisted(() => ({
  mockOrderFindUnique: vi.fn(),
  mockOrderUpdate: vi.fn(),
  mockEnrollmentCreate: vi.fn(),
  mockTransaction: vi.fn(),
}))

// ── Mock PrismaClient ─────────────────────────────────────────────────────────
vi.mock("../../../generated/prisma/client.js", () => {
  class PrismaClientMock {
    order = { findUnique: mockOrderFindUnique, update: mockOrderUpdate }
    enrollment = { create: mockEnrollmentCreate }
    $transaction = mockTransaction
  }
  return { PrismaClient: PrismaClientMock }
})

// ── Mock @prisma/adapter-pg ───────────────────────────────────────────────────
vi.mock("@prisma/adapter-pg", () => {
  class PrismaPgMock {}
  return { PrismaPg: PrismaPgMock }
})

// ── Import SUT after mocks ────────────────────────────────────────────────────
const { handleRazorpayWebhook, verifyRazorpaySignature } =
  await import("../webhook.js")

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeHmac(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex")
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    headers: {},
    body: {},
    rawBody: "{}",
    ...overrides,
  }
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

/** Valid non-empty string for secrets/payloads */
const nonEmptyString = fc.string({ minLength: 1 })

/** A distinct secret (different from base secret) */
const differentSecretArb = (base: string) =>
  fc.string({ minLength: 1 }).filter((s) => s !== base)

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("webhook.ts — property-based tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── P6: HMAC signature verification ──────────────────────────────────────
  describe("P6: HMAC signature verification", () => {
    it(
      // Feature: course-purchase-enrollment, Property 6: HMAC signature verification — valid signature returns true
      "P6a: verifyRazorpaySignature returns true for any payload with a correctly computed signature",
      async () => {
        await fc.assert(
          fc.asyncProperty(
            nonEmptyString, // rawPayload
            nonEmptyString, // secret
            async (payload, secret) => {
              const signature = computeHmac(payload, secret)
              expect(verifyRazorpaySignature(payload, signature, secret)).toBe(true)
            },
          ),
          { numRuns: 100 },
        )
      },
    )

    it(
      // Feature: course-purchase-enrollment, Property 6: HMAC signature verification — tampered payload returns false
      "P6b: verifyRazorpaySignature returns false for any tampered payload",
      async () => {
        await fc.assert(
          fc.asyncProperty(
            nonEmptyString,           // rawPayload
            nonEmptyString,           // secret
            fc.string({ minLength: 1 }), // tamper suffix
            async (payload, secret, suffix) => {
              const signature = computeHmac(payload, secret)
              const tampered = payload + suffix
              // Only test when tampered !== original (suffix changes the string)
              if (tampered === payload) return
              expect(verifyRazorpaySignature(tampered, signature, secret)).toBe(false)
            },
          ),
          { numRuns: 100 },
        )
      },
    )

    it(
      // Feature: course-purchase-enrollment, Property 6: HMAC signature verification — wrong secret returns false
      "P6c: verifyRazorpaySignature returns false when signature is computed with a different secret",
      async () => {
        await fc.assert(
          fc.asyncProperty(
            nonEmptyString, // rawPayload
            nonEmptyString, // correct secret
            nonEmptyString, // wrong secret (may coincide — filtered below)
            async (payload, correctSecret, wrongSecret) => {
              if (correctSecret === wrongSecret) return
              const signature = computeHmac(payload, wrongSecret)
              expect(verifyRazorpaySignature(payload, signature, correctSecret)).toBe(false)
            },
          ),
          { numRuns: 100 },
        )
      },
    )
  })

  // ── P7: payment.captured atomically creates enrollment ───────────────────
  it(
    // Feature: course-purchase-enrollment, Property 7: payment.captured atomically creates enrollment
    "P7: for any PENDING order, payment.captured calls $transaction once and returns 200",
    async () => {
      const SECRET = "test_secret_p7"
      process.env.RAZORPAY_WEBHOOK_SECRET = SECRET

      await fc.assert(
        fc.asyncProperty(
          nonEmptyString, // razorpayOrderId
          nonEmptyString, // razorpayPaymentId
          nonEmptyString, // clerkUserId
          nonEmptyString, // courseId
          async (razorpayOrderId, razorpayPaymentId, clerkUserId, courseId) => {
            vi.clearAllMocks()

            const pendingOrder = {
              id: "db-order-id",
              clerkUserId,
              courseId,
              razorpayOrderId,
              status: "PENDING",
            }

            mockOrderFindUnique.mockResolvedValue(pendingOrder)
            mockTransaction.mockResolvedValue([
              { status: "COMPLETED" },
              { id: "enroll-id", clerkUserId, courseId },
            ])

            const body = JSON.stringify({
              event: "payment.captured",
              payload: {
                payment: {
                  entity: { id: razorpayPaymentId, order_id: razorpayOrderId },
                },
              },
            })
            const sig = computeHmac(body, SECRET)

            const req = makeReq({
              headers: { "x-razorpay-signature": sig },
              rawBody: body,
              body: JSON.parse(body),
            })
            const res = makeRes()

            await handleRazorpayWebhook(req as never, res as never)

            expect(res.statusCode).toBe(200)
            // The $transaction must be called exactly once (atomic operation)
            expect(mockTransaction).toHaveBeenCalledTimes(1)
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  // ── P8: payment.captured idempotency ─────────────────────────────────────
  it(
    // Feature: course-purchase-enrollment, Property 8: payment.captured idempotency for already-COMPLETED orders
    "P8: for any COMPLETED order + existing enrollment, payment.captured returns 200 and does NOT call $transaction",
    async () => {
      const SECRET = "test_secret_p8"
      process.env.RAZORPAY_WEBHOOK_SECRET = SECRET

      await fc.assert(
        fc.asyncProperty(
          nonEmptyString, // razorpayOrderId
          nonEmptyString, // razorpayPaymentId
          nonEmptyString, // clerkUserId
          nonEmptyString, // courseId
          async (razorpayOrderId, razorpayPaymentId, clerkUserId, courseId) => {
            vi.clearAllMocks()

            const completedOrder = {
              id: "db-order-id",
              clerkUserId,
              courseId,
              razorpayOrderId,
              status: "COMPLETED",
            }

            mockOrderFindUnique.mockResolvedValue(completedOrder)

            const body = JSON.stringify({
              event: "payment.captured",
              payload: {
                payment: {
                  entity: { id: razorpayPaymentId, order_id: razorpayOrderId },
                },
              },
            })
            const sig = computeHmac(body, SECRET)

            const req = makeReq({
              headers: { "x-razorpay-signature": sig },
              rawBody: body,
              body: JSON.parse(body),
            })
            const res = makeRes()

            await handleRazorpayWebhook(req as never, res as never)

            expect(res.statusCode).toBe(200)
            // $transaction must NOT be called — no duplicate enrollment
            expect(mockTransaction).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    },
  )

  // ── P9: payment.failed idempotency for non-PENDING states ────────────────
  it(
    // Feature: course-purchase-enrollment, Property 9: payment.failed idempotency for COMPLETED/FAILED/missing orders
    "P9: for any COMPLETED, FAILED, or non-existent order, payment.failed returns 200 and does NOT call $transaction",
    async () => {
      const SECRET = "test_secret_p9"
      process.env.RAZORPAY_WEBHOOK_SECRET = SECRET

      // Covers COMPLETED, FAILED, and null (missing)
      const orderStateArb = fc.oneof(
        fc.constant("COMPLETED"),
        fc.constant("FAILED"),
        fc.constant(null), // no order found
      )

      await fc.assert(
        fc.asyncProperty(
          nonEmptyString, // razorpayOrderId
          nonEmptyString, // razorpayPaymentId
          orderStateArb,  // order state
          async (razorpayOrderId, razorpayPaymentId, orderState) => {
            vi.clearAllMocks()

            if (orderState === null) {
              mockOrderFindUnique.mockResolvedValue(null)
            } else {
              mockOrderFindUnique.mockResolvedValue({
                id: "db-order-id",
                razorpayOrderId,
                status: orderState,
              })
            }

            const body = JSON.stringify({
              event: "payment.failed",
              payload: {
                payment: {
                  entity: { id: razorpayPaymentId, order_id: razorpayOrderId },
                },
              },
            })
            const sig = computeHmac(body, SECRET)

            const req = makeReq({
              headers: { "x-razorpay-signature": sig },
              rawBody: body,
              body: JSON.parse(body),
            })
            const res = makeRes()

            await handleRazorpayWebhook(req as never, res as never)

            expect(res.statusCode).toBe(200)
            // $transaction must never be called for non-PENDING states
            expect(mockTransaction).not.toHaveBeenCalled()
            // order.update must not be called (no side effects)
            expect(mockOrderUpdate).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    },
  )
})
