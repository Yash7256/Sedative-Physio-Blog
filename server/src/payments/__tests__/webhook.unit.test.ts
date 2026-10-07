import crypto from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ── Prisma mock ──────────────────────────────────────────────────────────────
// vi.mock is hoisted to the top of the file, so the factory cannot reference
// variables declared with const/let. Use vi.hoisted to create them inside the
// hoisted zone so they're available when the factory runs.

const { mockTx, mockPrisma } = vi.hoisted(() => {
  const mockTx = {
    order: {
      update: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn(),
    },
    enrollment: {
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  }

  const mockPrisma = {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    enrollment: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
    },
    course: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  }

  return { mockTx, mockPrisma }
})

vi.mock("../../lib/prisma.js", () => ({ prisma: mockPrisma }))

// Mock Razorpay SDK to avoid instantiation errors in createRazorpayOrder tests
vi.mock("razorpay", () => ({
  default: vi.fn().mockImplementation(() => ({
    orders: { create: vi.fn().mockResolvedValue({ id: "order_new", amount: 5000, currency: "INR" }) },
  })),
}))

// ── Now import the service ───────────────────────────────────────────────────
import {
  computePaymentSignature,
  computeWebhookSignature,
  processRazorpayWebhook,
  verifyRazorpayPayment,
  createRazorpayOrder,
} from "../service.js"

// ── Helpers ──────────────────────────────────────────────────────────────────
function makePayloadStr(event: string, orderId: string, paymentId: string): string {
  return JSON.stringify({
    event,
    payload: {
      order: { entity: { id: orderId, amount: 50000, currency: "INR" } },
      payment: { entity: { id: paymentId, order_id: orderId, amount: 50000 } },
    },
  })
}

function signPayload(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex")
}

function signPayment(secret: string, orderId: string, paymentId: string): string {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex")
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("computePaymentSignature / computeWebhookSignature", () => {
  it("computePaymentSignature produces correct HMAC", () => {
    const sig = computePaymentSignature("secret", "order_1", "pay_1")
    const expected = crypto.createHmac("sha256", "secret").update("order_1|pay_1").digest("hex")
    expect(sig).toBe(expected)
  })

  it("computeWebhookSignature produces correct HMAC", () => {
    const body = '{"event":"test"}'
    const sig = computeWebhookSignature("secret", body)
    const expected = crypto.createHmac("sha256", "secret").update(body).digest("hex")
    expect(sig).toBe(expected)
  })
})

describe("verifyRazorpayPayment", () => {
  const KEY_SECRET = "test_key_secret"
  const ORDER_ID = "order_abc123"
  const PAY_ID = "pay_xyz456"
  const VALID_SIG = signPayment(KEY_SECRET, ORDER_ID, PAY_ID)
  const LOCAL_USER = "local_user_cuid"

  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = KEY_SECRET
    vi.clearAllMocks()
    mockTx.order.update.mockResolvedValue({})
    mockTx.enrollment.upsert.mockResolvedValue({})
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx))
  })

  afterEach(() => {
    delete process.env.RAZORPAY_KEY_SECRET
  })

  it("valid signature marks order PAID and upserts enrollments", async () => {
    const order = {
      id: "internal_id",
      userId: LOCAL_USER,
      status: "PENDING",
      courseIds: ["course_1", "course_2"],
      razorpayPaymentId: null,
    }
    mockPrisma.order.findUnique.mockResolvedValue(order)

    const result = await verifyRazorpayPayment({
      razorpay_order_id: ORDER_ID,
      razorpay_payment_id: PAY_ID,
      razorpay_signature: VALID_SIG,
      localUserId: LOCAL_USER,
    })

    expect(result.success).toBe(true)
    expect(result.enrolledCount).toBe(2)
    expect(mockTx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PAID", razorpayPaymentId: PAY_ID }),
      }),
    )
    expect(mockTx.enrollment.upsert).toHaveBeenCalledTimes(2)
  })

  it("tampered signature throws BadRequestError", async () => {
    await expect(
      verifyRazorpayPayment({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAY_ID,
        razorpay_signature: "00deadbeef".repeat(4) + "00",
        localUserId: LOCAL_USER,
      }),
    ).rejects.toThrow("Invalid payment signature")
  })

  it("wrong signature (right length) throws BadRequestError", async () => {
    const wrongSig = "a".repeat(64)
    await expect(
      verifyRazorpayPayment({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAY_ID,
        razorpay_signature: wrongSig,
        localUserId: LOCAL_USER,
      }),
    ).rejects.toThrow("Invalid payment signature")
  })

  it("repeated delivery (already PAID) is idempotent — still upserts enrollments", async () => {
    const order = {
      id: "internal_id",
      userId: LOCAL_USER,
      status: "PAID",
      courseIds: ["course_1"],
      razorpayPaymentId: PAY_ID,
    }
    mockPrisma.order.findUnique.mockResolvedValue(order)

    const result = await verifyRazorpayPayment({
      razorpay_order_id: ORDER_ID,
      razorpay_payment_id: PAY_ID,
      razorpay_signature: VALID_SIG,
      localUserId: LOCAL_USER,
    })

    expect(result.success).toBe(true)
    // Should still upsert enrollments even for already-PAID
    expect(mockTx.enrollment.upsert).toHaveBeenCalledTimes(1)
  })

  it("different user throws ForbiddenError (403)", async () => {
    const order = {
      id: "internal_id",
      userId: "other_user_id",
      status: "PENDING",
      courseIds: ["course_1"],
      razorpayPaymentId: null,
    }
    mockPrisma.order.findUnique.mockResolvedValue(order)

    await expect(
      verifyRazorpayPayment({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAY_ID,
        razorpay_signature: VALID_SIG,
        localUserId: LOCAL_USER,
      }),
    ).rejects.toThrow("Order belongs to another user account")
  })

  it("missing localUserId throws UnauthorizedError", async () => {
    await expect(
      verifyRazorpayPayment({
        razorpay_order_id: ORDER_ID,
        razorpay_payment_id: PAY_ID,
        razorpay_signature: VALID_SIG,
        localUserId: null,
      }),
    ).rejects.toThrow("Please sign in to verify payment")
  })
})

describe("processRazorpayWebhook", () => {
  const WEBHOOK_SECRET = "webhook_secret_xyz"
  const ORDER_ID = "order_wh123"
  const PAY_ID = "pay_wh456"

  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
    vi.clearAllMocks()
    mockTx.order.update.mockResolvedValue({})
    mockTx.enrollment.upsert.mockResolvedValue({})
    mockTx.enrollment.deleteMany.mockResolvedValue({ count: 1 })
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx))
  })

  afterEach(() => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET
  })

  it("missing RAZORPAY_WEBHOOK_SECRET throws GatewayError", async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET
    await expect(
      processRazorpayWebhook({ rawBody: "{}", signature: "sig" }),
    ).rejects.toThrow("RAZORPAY_WEBHOOK_SECRET is not configured")
  })

  it("tampered body throws BadRequestError", async () => {
    const body = makePayloadStr("order.paid", ORDER_ID, PAY_ID)
    const wrongSig = signPayload(WEBHOOK_SECRET, body + "tampered")
    await expect(
      processRazorpayWebhook({ rawBody: body, signature: wrongSig }),
    ).rejects.toThrow("Invalid webhook signature")
  })

  it("valid order.paid marks PAID and upserts enrollments", async () => {
    const body = makePayloadStr("order.paid", ORDER_ID, PAY_ID)
    const sig = signPayload(WEBHOOK_SECRET, body)
    const order = {
      id: "int_id",
      userId: "user_1",
      status: "PENDING",
      courseIds: ["c1"],
      razorpayPaymentId: null,
      amount: 50000,
    }
    mockPrisma.order.findUnique.mockResolvedValue(order)

    const result = await processRazorpayWebhook({ rawBody: body, signature: sig })
    expect(result.processed).toBe(true)
    expect(mockTx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PAID" }) }),
    )
    expect(mockTx.enrollment.upsert).toHaveBeenCalledTimes(1)
  })

  it("valid payment.captured marks PAID and upserts enrollments", async () => {
    const body = makePayloadStr("payment.captured", ORDER_ID, PAY_ID)
    const sig = signPayload(WEBHOOK_SECRET, body)
    const order = {
      id: "int_id",
      userId: "user_1",
      status: "PENDING",
      courseIds: ["c1"],
      razorpayPaymentId: null,
      amount: 50000,
    }
    mockPrisma.order.findUnique.mockResolvedValue(order)

    const result = await processRazorpayWebhook({ rawBody: body, signature: sig })
    expect(result.processed).toBe(true)
  })

  it("repeated order.paid delivery is idempotent", async () => {
    const body = makePayloadStr("order.paid", ORDER_ID, PAY_ID)
    const sig = signPayload(WEBHOOK_SECRET, body)
    const order = {
      id: "int_id",
      userId: "user_1",
      status: "PAID",
      courseIds: ["c1"],
      razorpayPaymentId: PAY_ID,
      amount: 50000,
    }
    mockPrisma.order.findUnique.mockResolvedValue(order)

    const result = await processRazorpayWebhook({ rawBody: body, signature: sig })
    expect(result.processed).toBe(true)
    // No update needed since already PAID
    expect(mockTx.order.update).not.toHaveBeenCalled()
  })

  it("payment.failed sets status to FAILED for PENDING order", async () => {
    const body = JSON.stringify({
      event: "payment.failed",
      payload: {
        payment: { entity: { id: PAY_ID, order_id: ORDER_ID } },
      },
    })
    const sig = signPayload(WEBHOOK_SECRET, body)
    const order = {
      id: "int_id",
      userId: "user_1",
      status: "PENDING",
      courseIds: ["c1"],
      razorpayPaymentId: null,
      amount: 50000,
    }
    mockPrisma.order.findUnique.mockResolvedValue(order)

    const result = await processRazorpayWebhook({ rawBody: body, signature: sig })
    expect(result.processed).toBe(true)
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }),
    )
  })

  it("payment.failed does NOT overwrite PAID status", async () => {
    const body = JSON.stringify({
      event: "payment.failed",
      payload: {
        payment: { entity: { id: PAY_ID, order_id: ORDER_ID } },
      },
    })
    const sig = signPayload(WEBHOOK_SECRET, body)
    const order = {
      id: "int_id",
      userId: "user_1",
      status: "PAID",
      courseIds: ["c1"],
      razorpayPaymentId: PAY_ID,
      amount: 50000,
    }
    mockPrisma.order.findUnique.mockResolvedValue(order)

    const result = await processRazorpayWebhook({ rawBody: body, signature: sig })
    expect(result.processed).toBe(false)
    expect(mockPrisma.order.update).not.toHaveBeenCalled()
  })

  it("refund.processed full refund sets REFUNDED and deletes enrollments", async () => {
    const body = JSON.stringify({
      event: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: "rfnd_1",
            payment_id: PAY_ID,
            amount: 50000,
          },
        },
        payment: { entity: { id: PAY_ID, order_id: ORDER_ID, amount: 50000 } },
      },
    })
    const sig = signPayload(WEBHOOK_SECRET, body)
    const order = {
      id: "int_id",
      userId: "user_1",
      status: "PAID",
      courseIds: ["c1", "c2"],
      razorpayPaymentId: PAY_ID,
      amount: 50000,
    }
    mockPrisma.order.findUnique.mockResolvedValue(order)

    const result = await processRazorpayWebhook({ rawBody: body, signature: sig })
    expect(result.processed).toBe(true)
    expect(mockTx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REFUNDED" }) }),
    )
    // Enrollments must be deleted for a full refund
    expect(mockTx.enrollment.deleteMany).toHaveBeenCalledTimes(2)
  })

  it("refund.processed partial refund does NOT change order status", async () => {
    const body = JSON.stringify({
      event: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: "rfnd_partial",
            payment_id: PAY_ID,
            amount: 10000, // less than order.amount 50000
          },
        },
        payment: { entity: { id: PAY_ID, order_id: ORDER_ID, amount: 50000 } },
      },
    })
    const sig = signPayload(WEBHOOK_SECRET, body)
    const order = {
      id: "int_id",
      userId: "user_1",
      status: "PAID",
      courseIds: ["c1"],
      razorpayPaymentId: PAY_ID,
      amount: 50000,
    }
    mockPrisma.order.findUnique.mockResolvedValue(order)

    const result = await processRazorpayWebhook({ rawBody: body, signature: sig })
    expect(result.processed).toBe(true)
    // Status must NOT be changed for a partial refund
    expect(mockTx.order.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.update).not.toHaveBeenCalled()
    // Enrollments must NOT be deleted
    expect(mockTx.enrollment.deleteMany).not.toHaveBeenCalled()
  })

  it("refund.processed is ignored when order is not PAID", async () => {
    const body = JSON.stringify({
      event: "refund.processed",
      payload: {
        refund: {
          entity: {
            id: "rfnd_2",
            payment_id: PAY_ID,
            amount: 50000,
          },
        },
        payment: { entity: { id: PAY_ID, order_id: ORDER_ID, amount: 50000 } },
      },
    })
    const sig = signPayload(WEBHOOK_SECRET, body)
    const order = {
      id: "int_id",
      userId: "user_1",
      status: "PENDING", // not PAID
      courseIds: ["c1"],
      razorpayPaymentId: null,
      amount: 50000,
    }
    mockPrisma.order.findUnique.mockResolvedValue(order)

    const result = await processRazorpayWebhook({ rawBody: body, signature: sig })
    expect(result.processed).toBe(false)
    expect(mockTx.order.update).not.toHaveBeenCalled()
    expect(mockPrisma.order.update).not.toHaveBeenCalled()
  })

  it("amount mismatch on order.paid does not mark PAID", async () => {
    const body = JSON.stringify({
      event: "order.paid",
      payload: {
        order: { entity: { id: ORDER_ID, amount: 99999, currency: "INR" } },
        payment: { entity: { id: PAY_ID, order_id: ORDER_ID, amount: 99999 } },
      },
    })
    const sig = signPayload(WEBHOOK_SECRET, body)
    const order = {
      id: "int_id",
      userId: "user_1",
      status: "PENDING",
      courseIds: ["c1"],
      razorpayPaymentId: null,
      amount: 50000, // different
    }
    mockPrisma.order.findUnique.mockResolvedValue(order)

    const result = await processRazorpayWebhook({ rawBody: body, signature: sig })
    expect(result.processed).toBe(false)
    expect(mockTx.order.update).not.toHaveBeenCalled()
  })
})

describe("createRazorpayOrder", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_validkey"
    process.env.RAZORPAY_KEY_SECRET = "test_secret"
    vi.clearAllMocks()
    mockPrisma.enrollment.findMany.mockResolvedValue([])
    mockPrisma.order.findFirst.mockResolvedValue(null)
    mockPrisma.order.create.mockResolvedValue({})
  })

  afterEach(() => {
    delete process.env.RAZORPAY_KEY_ID
    delete process.env.RAZORPAY_KEY_SECRET
  })

  it("nonexistent course ID throws BadRequestError", async () => {
    mockPrisma.course.findMany.mockResolvedValue([]) // no courses found
    await expect(
      createRazorpayOrder({
        courseIds: ["nonexistent_id"],
        localUserId: "user_1",
      }),
    ).rejects.toThrow() // NotFoundError or BadRequestError
  })

  it("mix of published and unpublished course IDs throws BadRequestError", async () => {
    // Only 1 of 2 found (the other is unpublished)
    mockPrisma.course.findMany.mockResolvedValue([
      { id: "course_1", price: 5000, isFree: false },
    ])
    await expect(
      createRazorpayOrder({
        courseIds: ["course_1", "unpublished_course"],
        localUserId: "user_1",
      }),
    ).rejects.toThrow("Some selected courses are unavailable or not published")
  })
})
