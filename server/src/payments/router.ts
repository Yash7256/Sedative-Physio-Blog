import { Router } from "express"
import { authenticate } from "../auth/middleware.js"
import { BadRequestError, handleError, UnauthorizedError } from "../lib/errors.js"
import {
  createRazorpayOrder,
  enrollFreeCourses,
  getPaymentConfig,
  getUserEnrollments,
  processRazorpayWebhook,
  verifyRazorpayPayment,
} from "./service.js"

export const paymentsRouter = Router()

// Populates req.auth when a valid Bearer token is present; never rejects.
// Individual routes decide whether auth is required.
paymentsRouter.use(authenticate)

// GET /api/payments/config — returns Razorpay keyId
paymentsRouter.get("/config", (_req, res) => {
  try {
    const config = getPaymentConfig()
    res.status(200).json(config)
  } catch (err) {
    handleError(err, res)
  }
})

// GET /api/payments/my-enrollments — returns list of courseIds user is enrolled in
paymentsRouter.get("/my-enrollments", async (req, res) => {
  try {
    const userId = req.auth?.userId
    if (!userId) {
      res.status(200).json([])
      return
    }
    const courseIds = await getUserEnrollments(userId)
    res.status(200).json(courseIds)
  } catch (err) {
    handleError(err, res)
  }
})

// POST /api/payments/create-order — creates or reuses a Razorpay order
paymentsRouter.post("/create-order", async (req, res) => {
  try {
    const { courseIds, userEmail, userName } = req.body
    const userId = req.auth?.userId ?? null

    const order = await createRazorpayOrder({
      courseIds,
      userId,
      userEmail: userEmail ?? null,
      userName: userName ?? null,
    })

    res.status(200).json(order)
  } catch (err) {
    handleError(err, res)
  }
})

// POST /api/payments/verify — verifies payment signature and registers enrollment atomically
paymentsRouter.post("/verify", async (req, res) => {
  try {
    const userId = req.auth?.userId ?? null
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    const result = await verifyRazorpayPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId: userId ?? null,
    })

    res.status(200).json(result)
  } catch (err) {
    handleError(err, res)
  }
})

// POST /api/payments/free-enroll — enrolls logged-in user in free course(s)
paymentsRouter.post("/free-enroll", async (req, res) => {
  try {
    const userId = req.auth?.userId ?? null
    if (!userId) {
      throw new UnauthorizedError("Please sign in to enroll in this course")
    }

    const { courseIds } = req.body
    const result = await enrollFreeCourses({
      courseIds,
      userId,
    })

    res.status(200).json(result)
  } catch (err) {
    handleError(err, res)
  }
})

// POST /api/payments/webhook — Razorpay webhook listener for asynchronous confirmation
paymentsRouter.post("/webhook", async (req, res) => {
  try {
    const rawBody = (req as unknown as { rawBody?: string }).rawBody
    const signature = req.headers["x-razorpay-signature"] as string | undefined

    if (!rawBody || !signature) {
      throw new BadRequestError("Missing raw request body or webhook signature header")
    }

    const result = await processRazorpayWebhook({
      rawBody,
      signature,
    })

    res.status(200).json(result)
  } catch (err) {
    handleError(err, res)
  }
})
