import crypto from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { mockTx, mockPrisma } = vi.hoisted(() => {
  const mockTx = {
    order: {
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    enrollment: {
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  }

  const mockPrisma = {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    enrollment: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    course: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  }

  return { mockTx, mockPrisma }
})

vi.mock("../../lib/prisma.js", () => ({ prisma: mockPrisma }))
vi.mock("razorpay", () => ({
  default: vi.fn().mockImplementation(() => ({
    orders: { create: vi.fn().mockResolvedValue({ id: "order_new", amount: 5000, currency: "INR" }) },
  })),
}))

import {
  createRazorpayOrder,
  enrollFreeCourses,
  getPaymentConfig,
  processRazorpayWebhook,
  verifyRazorpayPayment,
} from "../service.js"

const KEY_SECRET = "test_key_secret"
const WEBHOOK_SECRET = "webhook_secret_xyz"
const ORDER_ID = "order_state"
const PAY_ID = "pay_state"
const LOCAL_USER = "local_user_cuid"

function signPayment(secret: string, orderId: string, paymentId: string): string {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex")
}

function signPayload(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex")
}

function paymentPayload(event: string, amount = 50000): string {
  return JSON.stringify({
    event,
    payload: {
      order: { entity: { id: ORDER_ID, amount, currency: "INR" } },
      payment: { entity: { id: PAY_ID, order_id: ORDER_ID, amount } },
    },
  })
}

function order(status: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "internal_id",
    userId: LOCAL_USER,
    status,
    courseIds: ["course_1"],
    razorpayPaymentId: PAY_ID,
    amount: 50000,
    ...overrides,
  }
}

async function verify() {
  return verifyRazorpayPayment({
    razorpay_order_id: ORDER_ID,
    razorpay_payment_id: PAY_ID,
    razorpay_signature: signPayment(KEY_SECRET, ORDER_ID, PAY_ID),
    localUserId: LOCAL_USER,
  })
}

async function webhook(event: string, overrides: Record<string, unknown> = {}) {
  const body = paymentPayload(event)
  return processRazorpayWebhook({ rawBody: body, signature: signPayload(WEBHOOK_SECRET, body), ...overrides })
}

describe("payments order state machine", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = KEY_SECRET
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
    process.env.RAZORPAY_KEY_ID = "rzp_test_validkey"
    vi.clearAllMocks()
    mockTx.order.update.mockResolvedValue({})
    mockTx.order.updateMany.mockResolvedValue({ count: 1 })
    mockTx.order.findFirst.mockResolvedValue(null)
    mockTx.enrollment.upsert.mockResolvedValue({})
    mockTx.enrollment.deleteMany.mockResolvedValue({ count: 1 })
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx))
  })

  afterEach(() => {
    delete process.env.RAZORPAY_KEY_SECRET
    delete process.env.RAZORPAY_WEBHOOK_SECRET
    delete process.env.RAZORPAY_KEY_ID
  })

  it("verify on a REFUNDED order is a 409 and writes nothing", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order("REFUNDED"))
    await expect(verify()).rejects.toThrow("This order was refunded.")
    expect(mockTx.order.update).not.toHaveBeenCalled()
    expect(mockTx.order.updateMany).not.toHaveBeenCalled()
    expect(mockTx.enrollment.upsert).not.toHaveBeenCalled()
  })

  it.each(["order.paid", "payment.captured"])(
    "webhook %s on a REFUNDED order is processed:false and writes nothing",
    async (event) => {
      mockPrisma.order.findUnique.mockResolvedValue(order("REFUNDED"))
      const result = await webhook(event)
      expect(result.processed).toBe(false)
      expect(mockTx.order.update).not.toHaveBeenCalled()
      expect(mockTx.order.updateMany).not.toHaveBeenCalled()
      expect(mockTx.enrollment.upsert).not.toHaveBeenCalled()
    },
  )

  it("FAILED -> PAID via verify succeeds and enrolls", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order("FAILED", { razorpayPaymentId: null }))
    const result = await verify()
    expect(result.success).toBe(true)
    expect(mockTx.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "internal_id", status: { in: ["PENDING", "FAILED"] } },
        data: expect.objectContaining({ status: "PAID" }),
      }),
    )
    expect(mockTx.enrollment.upsert).toHaveBeenCalledTimes(1)
  })

  it("FAILED -> PAID via webhook succeeds and enrolls", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order("FAILED"))
    const result = await webhook("payment.captured")
    expect(result.processed).toBe(true)
    expect(mockTx.order.updateMany).toHaveBeenCalled()
    expect(mockTx.enrollment.upsert).toHaveBeenCalledTimes(1)
  })

  it("PAID re-verify is idempotent and does not change the order row", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order("PAID"))
    const result = await verify()
    expect(result.success).toBe(true)
    expect(mockTx.order.update).not.toHaveBeenCalled()
    expect(mockTx.order.updateMany).not.toHaveBeenCalled()
    expect(mockTx.enrollment.upsert).toHaveBeenCalledTimes(1)
  })

  it("concurrent verify with updateMany count 0 succeeds without duplicate enrollment rows", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order("PENDING"))
    mockTx.order.updateMany.mockResolvedValue({ count: 0 })
    mockTx.order.findFirst.mockResolvedValue({ status: "PAID" })
    const result = await verify()
    expect(result.success).toBe(true)
    expect(mockTx.enrollment.upsert).toHaveBeenCalledTimes(1)
    expect(mockTx.enrollment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_courseId: { userId: LOCAL_USER, courseId: "course_1" } },
      }),
    )
  })

  it("updateMany count 0 with a REFUNDED re-read refuses", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order("PENDING"))
    mockTx.order.updateMany.mockResolvedValue({ count: 0 })
    mockTx.order.findFirst.mockResolvedValue({ status: "REFUNDED" })
    await expect(verify()).rejects.toThrow("This order was refunded.")
    expect(mockTx.enrollment.upsert).not.toHaveBeenCalled()
  })

  it("full refund on PAID deletes enrollments, on PENDING marks REFUNDED without enrollments", async () => {
    const body = JSON.stringify({
      event: "refund.processed",
      payload: {
        refund: { entity: { id: "rfnd_1", payment_id: PAY_ID, amount: 50000 } },
        payment: { entity: { id: PAY_ID, order_id: ORDER_ID, amount: 50000 } },
      },
    })
    const signature = signPayload(WEBHOOK_SECRET, body)

    mockPrisma.order.findUnique.mockResolvedValue(order("PAID"))
    await processRazorpayWebhook({ rawBody: body, signature })
    expect(mockTx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REFUNDED" }) }),
    )
    expect(mockTx.enrollment.deleteMany).toHaveBeenCalledTimes(1)

    vi.clearAllMocks()
    mockTx.order.updateMany.mockResolvedValue({ count: 1 })
    mockTx.enrollment.deleteMany.mockResolvedValue({ count: 1 })
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx))
    mockPrisma.order.findUnique.mockResolvedValue(order("PENDING", { razorpayPaymentId: null }))
    const result = await processRazorpayWebhook({ rawBody: body, signature })
    expect(result.processed).toBe(true)
    expect(mockTx.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "REFUNDED" } }),
    )
    expect(mockTx.enrollment.deleteMany).not.toHaveBeenCalled()
    expect(mockTx.enrollment.upsert).not.toHaveBeenCalled()
  })

  it("partial refund changes nothing", async () => {
    const body = JSON.stringify({
      event: "refund.processed",
      payload: {
        refund: { entity: { id: "rfnd_partial", payment_id: PAY_ID, amount: 10000 } },
        payment: { entity: { id: PAY_ID, order_id: ORDER_ID, amount: 50000 } },
      },
    })
    mockPrisma.order.findUnique.mockResolvedValue(order("PAID"))
    const result = await processRazorpayWebhook({ rawBody: body, signature: signPayload(WEBHOOK_SECRET, body) })
    expect(result.processed).toBe(true)
    expect(mockTx.order.update).not.toHaveBeenCalled()
    expect(mockTx.order.updateMany).not.toHaveBeenCalled()
    expect(mockTx.enrollment.deleteMany).not.toHaveBeenCalled()
  })

  it("legacy order with userId == null is refused with 403", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order("PENDING", { userId: null }))
    await expect(verify()).rejects.toThrow("legacy order")
    expect(mockTx.order.updateMany).not.toHaveBeenCalled()
  })

  it("misconfigured course pricing is a 409 from create-order and free-enroll", async () => {
    mockPrisma.course.findMany.mockResolvedValue([{ id: "course_bad", price: 5000, isFree: true }])
    await expect(
      createRazorpayOrder({ courseIds: ["course_bad"], localUserId: LOCAL_USER }),
    ).rejects.toThrow("Course pricing is misconfigured.")
    await expect(
      enrollFreeCourses({ courseIds: ["course_bad"], localUserId: LOCAL_USER }),
    ).rejects.toThrow("Course pricing is misconfigured.")
  })

  it("config errors do not name environment variables or .env files", () => {
    delete process.env.RAZORPAY_KEY_ID
    let message = ""
    try {
      getPaymentConfig()
    } catch (err) {
      message = (err as Error).message
    }
    expect(message.toLowerCase()).not.toContain("razorpay")
    expect(message).not.toContain(".env")
  })
})
