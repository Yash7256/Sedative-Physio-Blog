import crypto from "node:crypto"
import Razorpay from "razorpay"
import { classifyCoursePricing } from "../lib/course-pricing.js"
import { prisma } from "../lib/prisma.js"
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  GatewayError,
  NotFoundError,
  UnauthorizedError,
} from "../lib/errors.js"

/**
 * Timing-safe hex string comparison. Returns false if lengths differ.
 */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"))
  } catch {
    return false
  }
}

/**
 * Compute HMAC-SHA256 signature for Razorpay payment verification.
 */
export function computePaymentSignature(secret: string, orderId: string, paymentId: string): string {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex")
}

/**
 * Compute HMAC-SHA256 signature for Razorpay webhook verification.
 */
export function computeWebhookSignature(secret: string, rawBody: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex")
}

function getRazorpayClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET

  if (!key_id || !key_secret || key_id.startsWith("rzp_test_...")) {
    console.error("[payments] Gateway credentials are missing or placeholders")
    throw new GatewayError("Payments are temporarily unavailable.")
  }

  return new Razorpay({ key_id, key_secret })
}

export function getPaymentConfig(): { keyId: string } {
  const keyId = process.env.RAZORPAY_KEY_ID
  if (!keyId || keyId.startsWith("rzp_test_...")) {
    console.error("[payments] Gateway key id is missing or a placeholder")
    throw new GatewayError("Payments are temporarily unavailable.")
  }
  return { keyId }
}

/** Readiness probe: a cheap authenticated read, with no order side effects. */
export async function paymentsReachable(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const keyId = env.RAZORPAY_KEY_ID
  const keySecret = env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret || keyId.startsWith("rzp_test_...")) return false
  try {
    await new Razorpay({ key_id: keyId, key_secret: keySecret }).orders.all({ count: 1 })
    return true
  } catch {
    return false
  }
}

export interface CreateOrderParams {
  courseIds: string[]
  /** This app's `User.id` cuid — required for order creation */
  localUserId: string
  userEmail?: string | null
  userName?: string | null
}

export interface CreateOrderResult {
  orderId: string
  amount: number
  currency: string
  keyId: string
  courseIds: string[]
}

/**
 * Fetch course IDs the given local user is currently enrolled in.
 *
 * Takes `User.id`, not Clerk's id — see `CreateOrderParams`.
 */
export async function getUserEnrollments(localUserId: string): Promise<string[]> {
  if (!localUserId) return []
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: localUserId },
    select: { courseId: true },
  })
  return enrollments.map((e) => e.courseId)
}

export interface UserOrder {
  id: string
  amount: number
  currency: string
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED"
  courseIds: string[]
  createdAt: string
}

/**
 * The given local user's own orders, newest first.
 *
 * Scoped by primary key rather than by email: `userEmail` is a denormalised
 * mirror kept for order records, and matching on it would let anyone who knows
 * an address read another person's purchase history. Orders placed before the
 * Clerk migration have a null `userId` and belong to nobody, so they are simply
 * absent here.
 */
export async function getUserOrders(localUserId: string): Promise<UserOrder[]> {
  if (!localUserId) return []

  const orders = await prisma.order.findMany({
    where: { userId: localUserId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      courseIds: true,
      createdAt: true,
    },
  })

  return orders.map((o) => ({
    id: o.id,
    amount: o.amount,
    currency: o.currency,
    status: o.status,
    courseIds: o.courseIds,
    // JSON has no Date; the client formats this for display.
    createdAt: o.createdAt.toISOString(),
  }))
}

/**
 * Create a new Razorpay order or reuse a recently created pending order (within 15 mins).
 */
export async function createRazorpayOrder({
  courseIds,
  localUserId,
  userEmail,
  userName,
}: CreateOrderParams): Promise<CreateOrderResult> {
  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    throw new BadRequestError("At least one courseId is required")
  }

  // Deduplicate incoming IDs
  const dedupedIds = Array.from(new Set(courseIds))

  // Fetch published course records
  const courses = await prisma.course.findMany({
    where: {
      id: { in: dedupedIds },
      isPublished: true,
    },
  })

  if (courses.length === 0) {
    throw new NotFoundError("Selected courses were not found or are not published")
  }

  // If count differs, some IDs were unavailable/unpublished
  if (courses.length !== dedupedIds.length) {
    throw new BadRequestError("Some selected courses are unavailable or not published")
  }

  // Use DB-verified IDs from here on
  const verifiedIds = courses.map((c) => c.id)
  const kinds = courses.map(classifyCoursePricing)
  if (kinds.includes("free")) {
    throw new BadRequestError("Free courses must be enrolled through free enrollment.")
  }

  // Guard against duplicate purchase if user is already enrolled
  if (localUserId) {
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        userId: localUserId,
        courseId: { in: verifiedIds },
      },
      include: { course: { select: { title: true } } },
    })

    if (existingEnrollments.length > 0) {
      const titles = existingEnrollments.map((e) => `"${e.course.title}"`).join(", ")
      throw new BadRequestError(
        `You are already enrolled in ${titles}. Please remove from your cart to proceed.`,
      )
    }
  }

  // Server-side price calculation
  const totalPaise = courses.reduce((sum, c) => sum + (c.isFree ? 0 : c.price), 0)

  if (totalPaise <= 0) {
    throw new BadRequestError("All selected courses are free. Please use free enrollment.")
  }

  // Pending order deduplication: check if an identical order was created within the last 15 mins
  if (localUserId) {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const existingPendingOrder = await prisma.order.findFirst({
      where: {
        userId: localUserId,
        status: "PENDING",
        amount: totalPaise,
        createdAt: { gte: fifteenMinutesAgo },
      },
    })

    if (
      existingPendingOrder &&
      existingPendingOrder.courseIds.length === verifiedIds.length &&
      existingPendingOrder.courseIds.every((id) => verifiedIds.includes(id))
    ) {
      return {
        orderId: existingPendingOrder.razorpayOrderId,
        amount: existingPendingOrder.amount,
        currency: existingPendingOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID ?? "",
        courseIds: existingPendingOrder.courseIds,
      }
    }
  }

  const razorpay = getRazorpayClient()
  const keyId = process.env.RAZORPAY_KEY_ID ?? ""
  const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`.slice(0, 40)

  const razorpayOrder = await razorpay.orders.create({
    amount: totalPaise,
    currency: "INR",
    receipt,
    notes: {
      courseIds: verifiedIds.join(","),
      userId: localUserId ?? "",
      userEmail: userEmail ?? "",
    },
  })

  await prisma.order.create({
    data: {
      userId: localUserId ?? null,
      userEmail: userEmail ?? null,
      userName: userName ?? null,
      amount: totalPaise,
      currency: "INR",
      status: "PENDING",
      razorpayOrderId: razorpayOrder.id,
      courseIds: verifiedIds,
    },
  })

  return {
    orderId: razorpayOrder.id,
    amount: Number(razorpayOrder.amount),
    currency: razorpayOrder.currency,
    keyId,
    courseIds: verifiedIds,
  }
}

export interface VerifyPaymentParams {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
  /** This app's `User.id` cuid, resolved by the route. See `CreateOrderParams`. */
  localUserId?: string | null
}

export interface VerifyPaymentResult {
  success: boolean
  orderId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  enrolledCount: number
}

/** Minimal transactional surface used by the payment state machine. */
interface PaymentTx {
  order: {
    updateMany(args: {
      where: { id: string; status: { in: string[] } }
      data: Record<string, unknown>
    }): Promise<{ count: number }>
    findFirst(args: {
      where: { id: string }
      select: { status: true }
    }): Promise<{ status: string } | null>
  }
  enrollment: {
    upsert(args: unknown): Promise<unknown>
  }
}

interface PayableOrder {
  id: string
  userId: string | null
  courseIds: string[]
}

async function upsertEnrollments(tx: PaymentTx, order: PayableOrder, userId: string | null): Promise<void> {
  if (!userId) return
  for (const courseId of order.courseIds) {
    await tx.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId },
      update: {},
    })
  }
}

/**
 * The only place that writes `status: "PAID"`. The conditional update makes
 * PENDING/FAILED -> PAID atomic and makes REFUNDED terminal: a replayed verify
 * or a late webhook can never resurrect a refunded order.
 */
async function markOrderPaid(
  tx: PaymentTx,
  order: PayableOrder,
  fields: Record<string, unknown>,
): Promise<boolean> {
  const { count } = await tx.order.updateMany({
    where: { id: order.id, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "PAID", ...fields },
  })

  if (count === 1) {
    await upsertEnrollments(tx, order, order.userId)
    return true
  }

  // Lost the race with a concurrent verify: PAID is idempotent (repair missing
  // enrollments only), REFUNDED refuses.
  const current = await tx.order.findFirst({ where: { id: order.id }, select: { status: true } })
  if (current?.status === "PAID") {
    await upsertEnrollments(tx, order, order.userId)
    return true
  }
  return false
}

/**
 * Verify Razorpay payment signature and execute atomic enrollment transaction.
 */
export async function verifyRazorpayPayment({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  localUserId,
}: VerifyPaymentParams): Promise<VerifyPaymentResult> {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new BadRequestError("Missing required Razorpay payment verification fields")
  }

  const secret = process.env.RAZORPAY_KEY_SECRET ?? ""
  if (!secret) {
    console.error("[payments] Gateway secret is missing")
    throw new GatewayError("Payments are temporarily unavailable.")
  }

  const generatedSignature = computePaymentSignature(secret, razorpay_order_id, razorpay_payment_id)

  if (!safeEqualHex(generatedSignature, razorpay_signature)) {
    throw new BadRequestError("Invalid payment signature")
  }

  const order = await prisma.order.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
  })

  if (!order) {
    throw new NotFoundError("Order not found")
  }

  // Strict ownership check
  if (!localUserId) {
    throw new UnauthorizedError("Please sign in to verify payment")
  }
  if (order.userId && order.userId !== localUserId) {
    throw new ForbiddenError("Order belongs to another user account")
  }
  if (!order.userId) {
    throw new ForbiddenError("This legacy order has no owner; please contact support")
  }

  if (order.status === "REFUNDED") {
    throw new ConflictError("This order was refunded.")
  }

  // Idempotency: a PAID order keeps its row untouched; only missing
  // enrollments are repaired.
  if (order.status === "PAID") {
    await prisma.$transaction(async (tx) => {
      await upsertEnrollments(tx as unknown as PaymentTx, order, order.userId as string)
    })
    return {
      success: true,
      orderId: order.id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: order.razorpayPaymentId ?? razorpay_payment_id,
      enrolledCount: order.courseIds.length,
    }
  }

  const paid = await prisma.$transaction(async (tx) => {
    return markOrderPaid(tx as unknown as PaymentTx, order, {
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      userId: order.userId,
    })
  })

  if (!paid) {
    throw new ConflictError("This order was refunded.")
  }

  return {
    success: true,
    orderId: order.id,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    enrolledCount: order.courseIds.length,
  }
}

/**
 * Handle incoming webhooks from Razorpay (e.g. order.paid, payment.captured).
 */
export async function processRazorpayWebhook({
  rawBody,
  signature,
}: {
  rawBody: string
  signature: string
}): Promise<{ received: boolean; processed: boolean; event: string }> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    console.error("[webhook] Gateway webhook secret is missing")
    throw new GatewayError("Webhook verification is temporarily unavailable.")
  }

  const expectedSignature = computeWebhookSignature(secret, rawBody)

  if (!safeEqualHex(expectedSignature, signature)) {
    throw new BadRequestError("Invalid webhook signature")
  }

  const payload = JSON.parse(rawBody) as {
    event: string
    payload?: {
      order?: { entity?: { id: string; amount?: number; currency?: string } }
      payment?: { entity?: { id: string; order_id?: string; amount?: number; currency?: string } }
      refund?: { entity?: { id: string; payment_id?: string; amount?: number } }
    }
  }

  const event = payload.event

  // ── order.paid / payment.captured ───────────────────────────────────────
  if (event === "order.paid" || event === "payment.captured") {
    const razorpayOrderId =
      payload.payload?.order?.entity?.id ?? payload.payload?.payment?.entity?.order_id
    const razorpayPaymentId = payload.payload?.payment?.entity?.id
    const paymentAmount = payload.payload?.payment?.entity?.amount ?? payload.payload?.order?.entity?.amount
    const currency = payload.payload?.payment?.entity?.currency ?? payload.payload?.order?.entity?.currency

    if (!razorpayOrderId) {
      return { received: true, processed: false, event }
    }

    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
    })

    if (!order) {
      return { received: true, processed: false, event }
    }

    // Amount and currency validation
    if (paymentAmount !== undefined && paymentAmount !== order.amount) {
      console.error(
        `[webhook] Amount mismatch for order ${razorpayOrderId}: expected ${order.amount}, got ${paymentAmount}`,
      )
      return { received: true, processed: false, event }
    }

    if (currency !== undefined && currency !== "INR") {
      console.error(`[webhook] Non-INR currency for order ${razorpayOrderId}: ${currency}`)
      return { received: true, processed: false, event }
    }

    if (order.status === "REFUNDED") {
      return { received: true, processed: false, event }
    }
    if (order.status === "PAID") {
      return { received: true, processed: true, event }
    }

    const paid = await prisma.$transaction(async (tx) => {
      return markOrderPaid(tx as unknown as PaymentTx, order, {
        razorpayPaymentId: razorpayPaymentId ?? order.razorpayPaymentId,
      })
    })

    return { received: true, processed: paid, event }
  }

  // ── payment.failed ───────────────────────────────────────────────────────
  if (event === "payment.failed") {
    const razorpayOrderId = payload.payload?.payment?.entity?.order_id

    if (!razorpayOrderId) {
      return { received: true, processed: false, event }
    }

    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
    })

    if (!order) {
      return { received: true, processed: false, event }
    }

    // Never overwrite a PAID order
    if (order.status !== "PENDING") {
      return { received: true, processed: false, event }
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "FAILED" },
    })

    return { received: true, processed: true, event }
  }

  // ── refund.processed ─────────────────────────────────────────────────────
  if (event === "refund.processed") {
    const razorpayPaymentId = payload.payload?.refund?.entity?.payment_id
    const refundAmount = payload.payload?.refund?.entity?.amount
    const orderEntityId = payload.payload?.payment?.entity?.order_id

    if (!razorpayPaymentId && !orderEntityId) {
      return { received: true, processed: false, event }
    }

    // Find order by payment ID or order ID
    const order = await (orderEntityId
      ? prisma.order.findUnique({ where: { razorpayOrderId: orderEntityId } })
      : prisma.order.findFirst({ where: { razorpayPaymentId } }))

    if (!order) {
      return { received: true, processed: false, event }
    }

    if (order.status === "REFUNDED") {
      return { received: true, processed: false, event }
    }

    const isFullRefund = refundAmount !== undefined && refundAmount >= order.amount
    if (!isFullRefund) {
      // Partial refund: do NOT change order status; just log.
      console.log(
        `[webhook] Partial refund for order ${order.id}: refunded ${refundAmount ?? "unknown"} of ${order.amount}. Status unchanged.`,
      )
      return { received: true, processed: true, event }
    }

    if (order.status === "PAID") {
      // Full refund: mark REFUNDED and delete enrollments atomically.
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "REFUNDED" },
        })

        if (order.userId) {
          for (const courseId of order.courseIds) {
            await tx.enrollment.deleteMany({
              where: { userId: order.userId, courseId },
            })
          }
        }
      })
      return { received: true, processed: true, event }
    }

    // A refund implies a prior capture even if its webhook arrived first.
    // Move PENDING/FAILED straight to the terminal REFUNDED state and create
    // no enrollments (decision D2).
    const refunded = await prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: { in: ["PENDING", "FAILED"] } },
        data: { status: "REFUNDED" },
      })
      return count === 1
    })

    return { received: true, processed: refunded, event }
  }

  return { received: true, processed: false, event }
}

export interface FreeEnrollParams {
  courseIds: string[]
  /** This app's `User.id` cuid, resolved by the route. See `CreateOrderParams`. */
  localUserId: string
}

export async function enrollFreeCourses({
  courseIds,
  localUserId,
}: FreeEnrollParams): Promise<{ success: boolean; enrolledCount: number }> {
  if (!localUserId) {
    throw new UnauthorizedError("You must be logged in to enroll")
  }

  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    throw new BadRequestError("At least one courseId is required")
  }

  const courses = await prisma.course.findMany({
    where: {
      id: { in: courseIds },
      isPublished: true,
    },
  })

  if (courses.length === 0) {
    throw new NotFoundError("No matching courses found")
  }

  const kinds = courses.map(classifyCoursePricing)
  if (kinds.includes("paid")) {
    throw new BadRequestError("One or more selected courses are not free")
  }

  // Atomic transaction
  await prisma.$transaction(async (tx) => {
    for (const course of courses) {
      await tx.enrollment.upsert({
        where: { userId_courseId: { userId: localUserId, courseId: course.id } },
        create: { userId: localUserId, courseId: course.id },
        update: {},
      })
    }
  })

  return {
    success: true,
    enrolledCount: courses.length,
  }
}
