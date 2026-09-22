import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { EnrollmentSource, OrderStatus } from "../../generated/prisma/client.js"
import { prisma } from "./client.js"

export const DEMO_CLERK_USER = "demo_user_01"

export async function seedEnrollmentsAndOrders() {
  const freeCourse = await prisma.course.findUnique({
    where: { slug: "human-anatomy-fundamentals" },
  })
  const paidCourse = await prisma.course.findUnique({
    where: { slug: "manual-therapy-techniques" },
  })

  if (freeCourse) {
    await prisma.enrollment.upsert({
      where: {
        clerkUserId_courseId: { clerkUserId: DEMO_CLERK_USER, courseId: freeCourse.id },
      },
      update: {},
      create: {
        clerkUserId: DEMO_CLERK_USER,
        courseId: freeCourse.id,
        source: EnrollmentSource.FREE,
      },
    })
  }

  if (paidCourse) {
    const razorpayOrderId = "order_demo_manual_therapy"
    await prisma.order.upsert({
      where: { razorpayOrderId },
      update: {
        status: OrderStatus.COMPLETED,
        razorpayPaymentId: "pay_demo_manual_therapy",
        razorpaySignature: "demo_signature",
      },
      create: {
        clerkUserId: DEMO_CLERK_USER,
        courseId: paidCourse.id,
        razorpayOrderId,
        razorpayPaymentId: "pay_demo_manual_therapy",
        razorpaySignature: "demo_signature",
        amount: paidCourse.price,
        currency: "INR",
        status: OrderStatus.COMPLETED,
      },
    })
    await prisma.enrollment.upsert({
      where: {
        clerkUserId_courseId: { clerkUserId: DEMO_CLERK_USER, courseId: paidCourse.id },
      },
      update: {},
      create: {
        clerkUserId: DEMO_CLERK_USER,
        courseId: paidCourse.id,
        source: EnrollmentSource.PURCHASE,
      },
    })
    console.log(`Seeded demo enrollment + order "${razorpayOrderId}" for ${DEMO_CLERK_USER}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  seedEnrollmentsAndOrders()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
