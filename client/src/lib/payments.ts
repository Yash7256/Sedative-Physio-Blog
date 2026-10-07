import { apiJson } from "./api"
import { loadRazorpayScript, type RazorpayPaymentResponse } from "./razorpay"

/**
 * The payment calls the browser makes, and the one place the Razorpay popup is
 * opened.
 *
 * Amounts are paise everywhere, matching the `Order.amount` column and Razorpay's
 * own unit. The total shown in the cart is computed from the cart, but the amount
 * that is actually charged is whatever the server calculated and returned in
 * `createOrder` — that value is what gets handed to the checkout, so a tampered
 * or stale cart total cannot change what the user is charged.
 */

export interface CreatedOrder {
  orderId: string
  amount: number
  currency: string
  keyId: string
  courseIds: string[]
}

export interface VerifyResult {
  success: boolean
  orderId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  enrolledCount: number
}

/**
 * Asks the server to create (or reuse) a Razorpay order for the paid items.
 *
 * The server re-reads the course prices and recalculates the total, so this
 * sends ids only — there is deliberately no amount to tamper with.
 */
export async function createOrder(courseIds: string[]): Promise<CreatedOrder> {
  return apiJson<CreatedOrder>("/api/payments/create-order", {
    method: "POST",
    body: JSON.stringify({ courseIds }),
  })
}

/**
 * Confirms a payment and enrols the buyer.
 *
 * The three fields are what Razorpay's checkout returns after the user pays;
 * the server recomputes the HMAC signature from its own key secret, so a
 * fabricated success response from the browser is rejected.
 */
export async function verifyPayment(response: RazorpayPaymentResponse): Promise<VerifyResult> {
  return apiJson<VerifyResult>("/api/payments/verify", {
    method: "POST",
    body: JSON.stringify(response),
  })
}

/** Enrols in free courses. Requires a session — the server rejects anonymous. */
export async function enrollFreeCourses(
  courseIds: string[],
): Promise<{ success: boolean; enrolledCount: number }> {
  return apiJson<{ success: boolean; enrolledCount: number }>("/api/payments/free-enroll", {
    method: "POST",
    body: JSON.stringify({ courseIds }),
  })
}

/**
 * Loads the checkout script and opens the payment window.
 *
 * Resolves with Razorpay's payment response, and rejects if the user closes the
 * window without paying. That rejection is the only way a checkout is abandoned,
 * so the caller must not treat a rejection as a failure to report loudly — a
 * cancellation is a decision, not an error.
 *
 * A failed script load is reported separately from a cancellation because the
 * first is a problem the user may be able to retry and the second is not worth an
 * error message.
 */
export async function payWithRazorpay(
  order: CreatedOrder,
  prefill: { name?: string; email?: string },
): Promise<RazorpayPaymentResponse> {
  // An empty keyId means the server has no Razorpay credentials. Caught here
  // because the checkout script would otherwise open a form that cannot succeed.
  if (!order.keyId) {
    throw new Error("Payments are not available right now. Please try again later.")
  }

  const loaded = await loadRazorpayScript()
  if (!loaded) {
    throw new Error("Could not reach the payment provider. Check your connection and try again.")
  }

  const RazorpayCtor = window.Razorpay
  if (!RazorpayCtor) {
    throw new Error("Could not reach the payment provider. Check your connection and try again.")
  }

  return new Promise<RazorpayPaymentResponse>((resolve, reject) => {
    // Razorpay keeps the checkout popup open after a payment.failed event so
    // the user can retry with a different card. We must NOT settle the promise
    // on failure — if we did, a later successful retry would be ignored (promise
    // already settled) and the user would be charged with no enrollment created.
    //
    // Instead: store the most recent failure reason. ondismiss is the single
    // settlement point for non-success exits. If a failure happened before the
    // user dismissed, reject with PaymentFailed; a plain close rejects with
    // PaymentCancelled. handler (success) always resolves, even after failures.
    let lastFailureReason: string | null = null

    // handler and ondismiss can both fire for the same attempt (e.g. payment
    // succeeds just as the modal closes). Settle exactly once.
    let settled = false
    const settle = (finish: () => void) => {
      if (settled) return
      settled = true
      finish()
    }

    const checkout = new RazorpayCtor({
      key: order.keyId,
      // The server's number, not the cart's.
      amount: order.amount,
      currency: order.currency,
      name: "Sedative Physio",
      description:
        order.courseIds.length === 1
          ? "Course enrollment"
          : `${order.courseIds.length} course enrollments`,
      order_id: order.orderId,
      prefill: { name: prefill.name, email: prefill.email },
      theme: { color: "#111214" },
      // Success: always resolve, regardless of any prior failures.
      handler: (response) => settle(() => resolve(response)),
      modal: {
        // ondismiss is the only rejection point. If the user saw a failure
        // before dismissing, surface that reason; otherwise it's a plain cancel.
        ondismiss: () =>
          settle(() =>
            lastFailureReason !== null
              ? reject(new PaymentFailed(lastFailureReason))
              : reject(new PaymentCancelled()),
          ),
        escape: true,
        // Closing by clicking the backdrop is too easy to do by accident, right
        // next to the pay button.
        backdropclose: false,
      },
    })

    checkout.open()

    // Store the failure reason but do NOT settle — the popup stays open for retry.
    checkout.on("payment.failed", (response: unknown) => {
      lastFailureReason =
        (response as { error?: { description?: string } })?.error?.description ??
        "Payment failed. Please try again."
    })
  })
}

/** Thrown when the user closes the checkout without paying. Not an error state. */
export class PaymentCancelled extends Error {
  constructor() {
    super("Payment cancelled")
    this.name = "PaymentCancelled"
  }
}

/** Thrown when Razorpay reports a payment failure. */
export class PaymentFailed extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = "PaymentFailed"
  }
}
