import { vi, describe, it, expect, beforeEach } from "vitest"
import crypto from "node:crypto"

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

vi.mock("../../../generated/prisma/client.js", () => {
  class PrismaClientMock {
    order = { findUnique: mockOrderFindUnique, update: mockOrderUpdate }
    enrollment = { create: mockEnrollmentCreate }
    $transaction = mockTransaction
  }
  return { PrismaClient: PrismaClientMock }
})

vi.mock("@prisma/adapter-pg", () => {
  class PrismaPgMock {}
  return { PrismaPg: PrismaPgMock }
})

const { handleRazorpayWebhook, verifyRazorpaySignature } =
  await import("../webhook.js")

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
    status(code: number) { this.statusCode = code; return this },
    json(body: unknown) { this.body = body; return this },
  }
  return res
}

function signBody(body: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex")
}

const SECRET = "test_webhook_secret"

describe("verifyRazorpaySignature", () => {
  it("returns true for a valid signature", () => {
    const body = JSON.stringify({ event: "payment.captured" })
    const sig = signBody(body, SECRET)
    expect(verifyRazorpaySignature(body, sig, SECRET)).toBe(true)
  })

  it("returns false for a tampered body", () => {
    const body = JSON.stringify({ event: "payment.captured" })
    const sig = signBody(body, SECRET)
    expect(verifyRazorpaySignature(body + "tampered", sig, SECRET)).toBe(false)
  })

  it("returns false for a wrong secret", () => {
    const body = JSON.stringify({ event: "payment.captured" })
    const sig = signBody(body, "wrong_secret")
    expect(verifyRazorpaySignature(body, sig, SECRET)).toBe(false)
  })
})

describe("handleRazorpayWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RAZORPAY_WEBHOOK_SECRET = SECRET
  })

  it("returns 400 when X-Razorpay-Signature header is missing", async () => {
    const req = makeReq({ headers: {}, rawBody: "{}" })
    const res = makeRes()
    await handleRazorpayWebhook(req as never, res as never)
    expect(res.statusCode).toBe(400)
  })

  it("returns 400 when signature is invalid", async () => {
    const body = "{}"
    const req = makeReq({
      headers: { "x-razorpay-signature": "bad_signature" },
      rawBody: body,
    })
    const res = makeRes()
    await handleRazorpayWebhook(req as never, res as never)
    expect(res.statusCode).toBe(400)
  })

  it("returns 404 when payment.captured order not found", async () => {
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_1", order_id: "order_xyz" } } },
    })
    const sig = signBody(body, SECRET)
    mockOrderFindUnique.mockResolvedValue(null)
    const req = makeReq({
      headers: { "x-razorpay-signature": sig },
      rawBody: body,
      body: JSON.parse(body),
    })
    const res = makeRes()
    await handleRazorpayWebhook(req as never, res as never)
    expect(res.statusCode).toBe(404)
  })

  it("returns 200 without side effects for unknown event type", async () => {
    const body = JSON.stringify({ event: "refund.created", payload: { payment: { entity: { id: "p", order_id: "o" } } } })
    const sig = signBody(body, SECRET)
    const req = makeReq({
      headers: { "x-razorpay-signature": sig },
      rawBody: body,
      body: JSON.parse(body),
    })
    const res = makeRes()
    await handleRazorpayWebhook(req as never, res as never)
    expect(res.statusCode).toBe(200)
    expect(mockTransaction).not.toHaveBeenCalled()
  })
})
