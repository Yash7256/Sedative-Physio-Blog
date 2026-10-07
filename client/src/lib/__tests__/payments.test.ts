import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  createOrder,
  enrollFreeCourses,
  payWithRazorpay,
  PaymentCancelled,
  PaymentFailed,
  verifyPayment,
} from "../payments"

/**
 * The checkout used to be a simulation — an 800ms sleep and a success modal. What
 * these protect is that the amount charged is the *server's* number, that the
 * popup cannot settle twice, and that closing it is reported as a cancellation
 * rather than a failure. The first two are money; the third is what decides
 * whether a user who changed their mind sees an error.
 */

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

const ORDER = {
  orderId: "order_Q1",
  amount: 49900,
  currency: "INR",
  keyId: "rzp_test_real",
  courseIds: ["c1"],
}

const PAYMENT = {
  razorpay_payment_id: "pay_1",
  razorpay_order_id: "order_Q1",
  razorpay_signature: "sig",
}

/** Captures the options the checkout was constructed with. */
let opened: Record<string, unknown> | null = null

class FakeRazorpay {
  constructor(options: Record<string, unknown>) {
    opened = options
  }
  open() {
    FakeRazorpay.openCalls++
  }
  on(event: string, callback: (response: unknown) => void) {
    handlers[event] = callback
    return this
  }
  static openCalls = 0
}

/** Event callbacks registered through `checkout.on`, keyed by event name. */
let handlers: Record<string, (response: unknown) => void> = {}

/** Fires a `payment.failed` the way Razorpay would after the popup reports one. */
const fail = (description = "Your card was declined.") =>
  handlers["payment.failed"]?.({ error: { description } })

beforeEach(() => {
  fetchMock.mockReset()
  opened = null
  handlers = {}
  FakeRazorpay.openCalls = 0
  vi.stubGlobal("fetch", fetchMock)
  // The checkout script is injected into a jsdom document, so stub the global it
  // defines rather than fetching a real one.
  vi.stubGlobal("Razorpay", FakeRazorpay)
  window.Razorpay = FakeRazorpay as never
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.Razorpay
})

/**
 * Starts a checkout and waits for the popup to be constructed.
 *
 * Two things this has to get right, both of which produce a silent hang rather
 * than a failure:
 *
 * - `payWithRazorpay` awaits the script loader before it builds the options, so
 *   reading them straight after the call would find `null`.
 * - The pending payment promise is handed back inside an object. Returning the
 *   promise itself from an `async` function would make this helper's own promise
 *   adopt it, so `await openCheckout()` would block forever waiting for a payment
 *   the test has not been able to trigger yet.
 */
async function openCheckout(
  order: typeof ORDER = ORDER,
  prefill: { name?: string; email?: string } = {},
) {
  const promise = payWithRazorpay(order, prefill)
  await vi.waitFor(() => expect(opened).not.toBeNull())
  return { promise }
}

const succeed = (payment: typeof PAYMENT = PAYMENT) =>
  (opened!.handler as (r: typeof PAYMENT) => void)(payment)

const dismiss = () => (opened!.modal as { ondismiss: () => void }).ondismiss()

describe("payment calls", () => {
  it("creates an order from ids alone, so there is no client amount to tamper with", async () => {
    fetchMock.mockResolvedValue(jsonResponse(ORDER))

    await createOrder(["c1", "c2"])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/payments/create-order")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body as string)).toEqual({ courseIds: ["c1", "c2"] })
  })

  it("posts the payment response back for server-side verification", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, orderId: "o1", razorpayPaymentId: "pay_1" }))

    await verifyPayment(PAYMENT)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/payments/verify")
    expect(JSON.parse(init.body as string)).toEqual(PAYMENT)
  })

  it("enrols free courses through the endpoint that requires a session", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, enrolledCount: 2 }))

    await enrollFreeCourses(["c1", "c2"])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/payments/free-enroll")
    expect(init.credentials).toBe("include")
  })

  it("surfaces the server's own message when it refuses", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "You are already enrolled in \"Anatomy\"." }, 400))

    await expect(createOrder(["c1"])).rejects.toThrow(/already enrolled/)
  })
})

describe("payWithRazorpay", () => {
  it("charges the amount the server calculated, not one derived from the cart", async () => {
    const { promise } = await openCheckout({ ...ORDER, amount: 49900 })
    succeed()

    await promise

    expect(opened).toMatchObject({ key: "rzp_test_real", amount: 49900, currency: "INR", order_id: "order_Q1" })
  })

  it("resolves with Razorpay's response so it can be verified server-side", async () => {
    const { promise } = await openCheckout()

    await expect((async () => (succeed(), await promise))()).resolves.toEqual(PAYMENT)
  })

  it("settles once when a payment lands and the window also closes", async () => {
    const { promise } = await openCheckout()

    succeed()
    dismiss()

    // The late dismiss must not turn a completed payment into a cancellation.
    await expect(promise).resolves.toEqual(PAYMENT)
  })

  it("reports a closed window as a cancellation, not a failure", async () => {
    const { promise } = await openCheckout()

    dismiss()

    await expect(promise).rejects.toBeInstanceOf(PaymentCancelled)
  })

  it("surfaces Razorpay's decline reason when the payment itself fails", async () => {
    const { promise } = await openCheckout()

    fail()

    await expect(promise).rejects.toBeInstanceOf(PaymentFailed)
    await expect(promise).rejects.toThrow(/declined/)
  })

  it("ignores a late dismissal after a failed payment", async () => {
    const { promise } = await openCheckout()

    fail("Card expired.")
    dismiss()

    await expect(promise).rejects.toThrow(/expired/)
  })

  it("refuses to open when the server has no Razorpay key", async () => {
    await expect(payWithRazorpay({ ...ORDER, keyId: "" }, {})).rejects.toThrow(/not available/i)
    // Nothing was opened, so the user is not looking at a form that cannot work.
    expect(FakeRazorpay.openCalls).toBe(0)
  })

  it("prefills from the signed-in profile", async () => {
    const { promise } = await openCheckout(ORDER, { name: "Ada Lovelace", email: "ada@example.com" })
    succeed()
    await promise

    expect(opened).toMatchObject({ prefill: { name: "Ada Lovelace", email: "ada@example.com" } })
  })
})
