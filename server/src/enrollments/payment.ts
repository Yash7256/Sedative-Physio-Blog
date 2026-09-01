import Razorpay from "razorpay"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client.js"
import {
  BadRequestError,
  ConflictError,
  GatewayError,
  NotFoundError,
} from "./errors.js"

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  if (process.env.NODE_ENV !== "test") {
    console.warn(
      "[enrollment] Warning: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set. Payment features will not work.",
    )
  }
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID ?? "",
  key_secret: process.env.RAZORPAY_KEY_SECRET ?? "",
})

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
})

export interface CreateOrderInput {
  clerkUserId: string
  courseId: string
}

export interface CreateOrderResult {
  orderId: string   // Razorpay order ID
  amount: number    // in paise
  currency: string  // "INR"
  keyId: string     // RAZORPAY_KEY_ID for client checkout SDK
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const { clerkUserId, courseId } = input

  // 1. Validate courseId is present and non-empty
  if (!courseId || courseId.trim() === "") {
    throw new BadRequestError("courseId is required")
  }

  // 2. Fetch the course — must be published
  const course = await prisma.course.findFirst({
    where: { id: courseId, isPublished: true },
  })
  if (!course) {
    throw new NotFoundError("Course not found")
  }

  // 3. Reject free courses
  if (course.isFree || course.price === 0) {
    throw new BadRequestError("Course does not require payment")
  }

  // 4. Check if already enrolled
  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { clerkUserId_courseId: { clerkUserId, courseId } },
  })
  if (existingEnrollment) {
    throw new ConflictError("Already enrolled in this course")
  }

  // 5. Return existing PENDING order if one already exists (idempotency)
  const existingOrder = await prisma.order.findFirst({
    where: { clerkUserId, courseId, status: "PENDING" },
  })
  if (existingOrder) {
    return {
      orderId: existingOrder.razorpayOrderId,
      amount: existingOrder.amount,
      currency: existingOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID ?? "",
    }
  }

  // 6. Create Razorpay order
  let razorpayOrder: { id: string; amount: number | string; currency: string }
  try {
    razorpayOrder = await razorpay.orders.create({
      amount: course.price,
      currency: "INR",
      receipt: `rcpt_${clerkUserId.slice(-8)}_${courseId.slice(-8)}`,
    }) as { id: string; amount: number | string; currency: string }
  } catch (err) {
    throw new GatewayError("Payment gateway error. Please try again.")
  }

  // 7. Persist the order record
  const order = await prisma.order.create({
    data: {
      clerkUserId,
      courseId,
      razorpayOrderId: razorpayOrder.id,
      amount: course.price,
      currency: "INR",
      status: "PENDING",
    },
  })

  return {
    orderId: order.razorpayOrderId,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
  }
}
