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
  userId?: string | null
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
 * Fetch course IDs that the user is currently enrolled in.
 */
export async function getUserEnrollments(userId: string): Promise<string[]> {
  if (!userId) return []
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    select: { courseId: true },
  })
  return enrollments.map((e) => e.courseId)
}

/**
 * Create a new Razorpay order or reuse a recently created pending order (within 15 mins).
 */
export async function createRazorpayOrder({
  courseIds,
  userId,
  userEmail,
  userName,
}: CreateOrderParams): Promise<CreateOrderResult> {
  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    throw new BadRequestError("At least one courseId is required")
  }

  // 1. Guard against duplicate purchase if user is already enrolled
  if (userId) {
    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        courseId: { in: courseIds },
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

  // 2. Fetch published course records
  const courses = await prisma.course.findMany({
    where: {
      id: { in: courseIds },
      isPublished: true,
    },
  })

  if (courses.length === 0) {
    throw new NotFoundError("Selected courses were not found or are not published")
  }

  // 3. Server-side price calculation
  const totalPaise = courses.reduce((sum, c) => sum + (c.isFree ? 0 : c.price), 0)

  if (totalPaise <= 0) {
    throw new BadRequestError("All selected courses are free. Please use free enrollment.")
  }

  // 4. Pending order deduplication: check if an identical order was created within the last 15 mins
  if (userId) {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    const existingPendingOrder = await prisma.order.findFirst({
      where: {
        userId,
        status: "PENDING",
        amount: totalPaise,
        createdAt: { gte: fifteenMinutesAgo },
      },
    })

    if (
      existingPendingOrder &&
      existingPendingOrder.courseIds.length === courseIds.length &&
      existingPendingOrder.courseIds.every((id) => courseIds.includes(id))
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
      courseIds: courseIds.join(","),
      userId: userId ?? "",
      userEmail: userEmail ?? "",
    },
  })

  await prisma.order.create({
    data: {
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      userName: userName ?? null,
      amount: totalPaise,
      currency: "INR",
      status: "PENDING",
      razorpayOrderId: razorpayOrder.id,
      courseIds,
    },
  })

  return {
    orderId: razorpayOrder.id,
    amount: Number(razorpayOrder.amount),
    currency: razorpayOrder.currency,
    keyId,
    courseIds,
  }
}

export interface VerifyPaymentParams {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
  userId?: string | null
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
  userId,
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

  // Security guard against order hijacking
  if (order.userId && userId && order.userId !== userId) {
    throw new ForbiddenError("Order belongs to another user account")
  }

  const effectiveUserId = order.userId ?? userId

  // Idempotency: if order is already marked PAID, return success
  if (order.status === "PAID") {
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
  userId: string
}

export async function enrollFreeCourses({
  courseIds,
  userId,
}: FreeEnrollParams): Promise<{ success: boolean; enrolledCount: number }> {
  if (!userId) {
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
        where: { userId_courseId: { userId, courseId: course.id } },
        create: { userId, courseId: course.id },
        update: {},
      })
    }
  })

  return {
    success: true,
    enrolledCount: courses.length,
  }
}
