import crypto from "node:crypto"
import type { Request, Response } from "express"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client.js"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
})

// ─── Task 7.1: HMAC-SHA256 signature verification ───────────────────────────

export function verifyRazorpaySignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")
  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(signature, "hex"),
    )
  } catch {
    return false
  }
}

// ─── Internal payload types ──────────────────────────────────────────────────

interface RazorpayPaymentPayload {
  payload: {
    payment: {
      entity: {
        id: string            // razorpayPaymentId
        order_id: string      // razorpayOrderId
      }
    }
  }
}

// ─── Task 7.2: payment.captured handler (atomic transaction) ────────────────

async function handlePaymentCaptured(
  payload: RazorpayPaymentPayload,
  res: Response,
): Promise<void> {
  const entity = payload.payload.payment.entity
  const razorpayOrderId = entity.order_id
  const razorpayPaymentId = entity.id

  const order = await prisma.order.findUnique({
    where: { razorpayOrderId },
  })

  if (!order) {
    res.status(404).json({ error: "Order not found" })
    return
  }

  // Idempotent: already completed
  if (order.status === "COMPLETED") {
    res.status(200).json({ received: true })
    return
  }

  // Atomic: update Order + create Enrollment in a transaction
  try {
    await prisma.$transaction([
      prisma.order.update({
        where: { razorpayOrderId },
        data: {
          status: "COMPLETED",
          razorpayPaymentId,
          razorpaySignature: razorpayPaymentId, // signature stored from webhook body
        },
      }),
      prisma.enrollment.create({
        data: {
          clerkUserId: order.clerkUserId,
          courseId: order.courseId,
          source: "PURCHASE",
        },
      }),
    ])
    res.status(200).json({ received: true })
  } catch (err) {
    console.error("[webhook] payment.captured transaction failed:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

// ─── Task 7.3: payment.failed handler ───────────────────────────────────────

async function handlePaymentFailed(
  payload: RazorpayPaymentPayload,
  res: Response,
): Promise<void> {
  const razorpayOrderId = payload.payload.payment.entity.order_id

  const order = await prisma.order.findUnique({
    where: { razorpayOrderId },
  })

  // Idempotent: non-PENDING or not found → no-op
  if (!order || order.status !== "PENDING") {
    res.status(200).json({ received: true })
    return
  }

  await prisma.order.update({
    where: { razorpayOrderId },
    data: { status: "FAILED" },
  })

  res.status(200).json({ received: true })
}

// ─── Task 7.4: Main webhook dispatcher ──────────────────────────────────────

export async function handleRazorpayWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const signature = req.headers["x-razorpay-signature"] as string | undefined
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? ""
  const rawBody = (req as unknown as { rawBody: string }).rawBody

  if (!signature) {
    res.status(400).json({ error: "Missing X-Razorpay-Signature header" })
    return
  }

  if (!verifyRazorpaySignature(rawBody, signature, secret)) {
    res.status(400).json({ error: "Invalid signature" })
    return
  }

  const event = req.body as { event: string } & RazorpayPaymentPayload

  if (event.event === "payment.captured") {
    await handlePaymentCaptured(event, res)
    return
  }

  if (event.event === "payment.failed") {
    await handlePaymentFailed(event, res)
    return
  }

  // Unknown event type — acknowledge without side effects
  res.status(200).json({ received: true })
}
