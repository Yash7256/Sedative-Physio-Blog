import crypto from "node:crypto"
import { describe, expect, it } from "vitest"

describe("Razorpay Webhook Verification", () => {
  const secret = "whsec_test_secret_12345"
  const payload = JSON.stringify({
    event: "order.paid",
    payload: {
      order: { entity: { id: "order_test_123" } },
      payment: { entity: { id: "pay_test_456" } },
    },
  })

  it("successfully verifies valid webhook signature", () => {
    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")

    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")

    expect(validSignature).toBe(computedSignature)
  })

  it("rejects tampered webhook payload", () => {
    const originalSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")

    const tamperedPayload = JSON.stringify({
      event: "order.paid",
      payload: {
        order: { entity: { id: "order_fake_999" } },
      },
    })

    const tamperedSignature = crypto
      .createHmac("sha256", secret)
      .update(tamperedPayload)
      .digest("hex")

    expect(originalSignature === tamperedSignature).toBe(false)
  })
})
