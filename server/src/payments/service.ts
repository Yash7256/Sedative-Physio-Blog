import crypto from "node:crypto"
import Razorpay from "razorpay"
import { prisma } from "../lib/prisma.js"
import {
  BadRequestError,
  ForbiddenError,
  GatewayError,
  NotFoundError,
  UnauthorizedError,
} from "../lib/errors.js"

function getRazorpayClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET

  if (!key_id || !key_secret || key_id.startsWith("rzp_test_...")) {
    throw new GatewayError(
      "Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env",
    )
  }

  return new Razorpay({ key_id, key_secret })
}

export function getPaymentConfig(): { keyId: string } {
  return {
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
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
  status: "PENDING" | "PAID" | "FAILED"
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
    throw new GatewayError("RAZORPAY_KEY_SECRET is not configured")
  }

  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`)
  const generatedSignature = hmac.digest("hex")

  if (generatedSignature !== razorpay_signature) {
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

  const effectiveUserId = order.userId ?? localUserId

  // Idempotency: if order is already marked PAID, still run enrollment upserts
  if (order.status === "PAID") {
    if (effectiveUserId) {
      await prisma.$transaction(async (tx) => {
        for (const courseId of order.courseIds) {
          await tx.enrollment.upsert({
            where: { userId_courseId: { userId: effectiveUserId, courseId } },
            create: { userId: effectiveUserId, courseId },
            update: {},
          })
        }
      })
    }
    return {
      success: true,
      orderId: order.id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: order.razorpayPaymentId ?? razorpay_payment_id,
      enrolledCount: order.courseIds.length,
    }
  }

  // Atomic database transaction: update order and upsert all enrollments together
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        userId: effectiveUserId,
      },
    })

    if (effectiveUserId) {
      for (const courseId of order.courseIds) {
        await tx.enrollment.upsert({
          where: { userId_courseId: { userId: effectiveUserId, courseId } },
          create: { userId: effectiveUserId, courseId },
          update: {},
        })
      }
    }
  })

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
    throw new GatewayError("RAZORPAY_WEBHOOK_SECRET is not configured")
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")

  if (expectedSignature !== signature) {
    throw new BadRequestError("Invalid webhook signature")
  }

  const payload = JSON.parse(rawBody) as {
    event: string
    payload?: {
      order?: { entity?: { id: string } }
      payment?: { entity?: { id: string; order_id?: string } }
    }
  }

  const event = payload.event
  if (event === "order.paid" || event === "payment.captured") {
    const razorpayOrderId =
      payload.payload?.order?.entity?.id ?? payload.payload?.payment?.entity?.order_id
    const razorpayPaymentId = payload.payload?.payment?.entity?.id

    if (!razorpayOrderId) {
      return { received: true, processed: false, event }
    }

    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
    })

    if (!order) {
      return { received: true, processed: false, event }
    }

    if (order.status === "PAID") {
      return { received: true, processed: true, event }
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          razorpayPaymentId: razorpayPaymentId ?? order.razorpayPaymentId,
        },
      })

      if (order.userId) {
        for (const courseId of order.courseIds) {
          await tx.enrollment.upsert({
            where: { userId_courseId: { userId: order.userId, courseId } },
            create: { userId: order.userId, courseId },
            update: {},
          })
        }
      }
    })

    return { received: true, processed: true, event }
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

  const nonFree = courses.filter((c) => !c.isFree && c.price > 0)
  if (nonFree.length > 0) {
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
