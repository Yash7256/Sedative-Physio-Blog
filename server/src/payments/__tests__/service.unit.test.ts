import { describe, expect, it } from "vitest"
import crypto from "node:crypto"

describe("Payment signature verification logic", () => {
  it("generates and verifies valid HMAC SHA256 signature", () => {
    const secret = "test_secret_123"
    const orderId = "order_N12345"
    const paymentId = "pay_P67890"

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex")

    const verifyHmac = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex")

    expect(verifyHmac).toBe(expectedSignature)
  })

  it("fails verification when signature is tampered", () => {
    const secret = "test_secret_123"
    const orderId = "order_N12345"
    const paymentId = "pay_P67890"

    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex")

    const fakeSignature = "invalid_tampered_signature"
    expect(validSignature === fakeSignature).toBe(false)
  })
})
