/**
 * Focused tests for Cart.handleCheckout edge cases.
 *
 * The Cart component has many dependencies; they are all mocked at the module
 * level. Each test drives a specific handleCheckout code path by configuring
 * those mocks, then clicking the checkout button and asserting on the outcome.
 */

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Cart } from "../Cart"

// ── Module mocks ──────────────────────────────────────────────────────────────

const { mockCreateOrder, mockVerifyPayment, mockPayWithRazorpay, mockEnrollFreeCourses } = vi.hoisted(() => ({
  mockCreateOrder: vi.fn(),
  mockVerifyPayment: vi.fn(),
  mockPayWithRazorpay: vi.fn(),
  mockEnrollFreeCourses: vi.fn(),
}))

vi.mock("@/lib/payments", () => ({
  createOrder: mockCreateOrder,
  verifyPayment: mockVerifyPayment,
  payWithRazorpay: mockPayWithRazorpay,
  enrollFreeCourses: mockEnrollFreeCourses,
  PaymentCancelled: class PaymentCancelled extends Error {
    constructor() { super("Payment cancelled"); this.name = "PaymentCancelled" }
  },
  PaymentFailed: class PaymentFailed extends Error {
    constructor(reason: string) { super(reason); this.name = "PaymentFailed" }
  },
}))

vi.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true, userId: "clerk_user" }),
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock("@/lib/auth", () => ({
  useAuthProfile: () => ({
    profile: { fullName: "Test User", email: "test@example.com" },
    isProfilePending: false,
    error: null,
    isSignedIn: true,
    isLoaded: true,
    refresh: vi.fn(),
    updateProfile: vi.fn(),
  }),
}))

// Cart items are controlled through this mutable object so each test can
// configure the cart independently.
const cartState = {
  items: [] as Array<{
    id: string; title: string; slug: string; price: number; isFree: boolean
    level: string; language: string; thumbnail: null
  }>,
  total: 0,
  clearCart: vi.fn(),
  removeItem: vi.fn(),
}

vi.mock("@/lib/cartContext", () => ({
  useCart: () => cartState,
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Stub heavy components so they don't pull in real fetch or 3-D viewer code.
vi.mock("@/components/PaymentSuccessModal", () => ({
  PaymentSuccessModal: ({ open, paymentId, orderId, isFree }: {
    open: boolean; paymentId?: string; orderId?: string; isFree?: boolean
  }) =>
    open ? (
      <div data-testid="success-modal">
        {isFree && <span>free</span>}
        {paymentId && <span data-testid="pay-id">{paymentId}</span>}
        {orderId && <span data-testid="order-id">{orderId}</span>}
      </div>
    ) : null,
}))

vi.mock("@/components/SmartImage", () => ({
  SmartImage: (props: { alt: string }) => <img alt={props.alt} />,
}))

vi.mock("@/lib/resources", () => ({
  fetchCourseDetail: vi.fn().mockResolvedValue({
    sections: [], highlights: [], tutor: null, level: "Beginner", language: "English",
    estimatedHours: 0, price: 0, isFree: true, id: "c1", title: "Course", slug: "course",
    shortDescription: null, thumbnail: null,
  }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePaidItem(id = "paid_1") {
  return {
    id, title: "Paid Course", slug: "paid-course", price: 49900,
    isFree: false, level: "Beginner", language: "English", thumbnail: null,
  }
}

function makeFreeItem(id = "free_1") {
  return {
    id, title: "Free Course", slug: "free-course", price: 0,
    isFree: true, level: "Beginner", language: "English", thumbnail: null,
  }
}

function renderCart() {
  return render(
    <MemoryRouter>
      <Cart />
    </MemoryRouter>,
  )
}

const checkoutButton = () =>
  screen.getByRole("button", { name: /proceed to checkout|enroll for free/i })

beforeEach(() => {
  vi.clearAllMocks()
  cartState.clearCart = vi.fn()
  cartState.removeItem = vi.fn()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("handleCheckout — free-enroll failure after successful payment", () => {
  it("clears cart and opens success modal even when post-payment free enroll throws", async () => {
    cartState.items = [makePaidItem(), makeFreeItem()]
    cartState.total = 49900

    const paymentResponse = {
      razorpay_payment_id: "pay_abc",
      razorpay_order_id: "order_abc",
      razorpay_signature: "sig_abc",
    }

    mockCreateOrder.mockResolvedValue({
      orderId: "order_abc", amount: 49900, currency: "INR",
      keyId: "rzp_test_key", courseIds: ["paid_1"],
    })
    mockPayWithRazorpay.mockResolvedValue(paymentResponse)
    mockVerifyPayment.mockResolvedValue({
      success: true, orderId: "int_order_1", razorpayOrderId: "order_abc",
      razorpayPaymentId: "pay_abc", enrolledCount: 1,
    })
    // Free enroll fails AFTER payment succeeded
    mockEnrollFreeCourses.mockRejectedValue(new Error("Network error"))

    renderCart()
    await userEvent.click(checkoutButton())

    // Cart is cleared even though free enroll failed
    await waitFor(() => expect(cartState.clearCart).toHaveBeenCalledTimes(1))

    // Success modal is shown for the paid items
    await waitFor(() => expect(screen.getByTestId("success-modal")).toBeInTheDocument())

    // A non-blocking notice is shown alongside the success modal
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/payment succeeded.*free courses/i),
    )
  })

  it("does NOT show the success modal when free-enroll fails in a free-only cart", async () => {
    cartState.items = [makeFreeItem()]
    cartState.total = 0

    mockEnrollFreeCourses.mockRejectedValue(new Error("Server error"))

    renderCart()
    await userEvent.click(checkoutButton())

    // A blocking error is shown
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/server error/i),
    )

    // Cart is NOT cleared — user can retry
    expect(cartState.clearCart).not.toHaveBeenCalled()
    expect(screen.queryByTestId("success-modal")).not.toBeInTheDocument()
  })
})
