import { Router } from "express"
import { clerkMiddleware, getAuth } from "@clerk/express"
import { requireAuth } from "../auth/middleware.js"
import { createOrder } from "./payment.js"
import { handleRazorpayWebhook } from "./webhook.js"
import {
  enrollFree,
  getEnrollmentStatus,
  listEnrollments,
} from "./service.js"
import { handleError } from "./errors.js"

export const enrollmentRouter = Router()

// Apply Clerk session middleware to all routes on this router
enrollmentRouter.use(clerkMiddleware())

// POST /api/enrollments/orders — create Razorpay order for a paid course
enrollmentRouter.post("/orders", requireAuth, async (req, res) => {
  try {
    const { userId } = getAuth(req)
    const { courseId } = req.body as { courseId?: string }
    const result = await createOrder({
      clerkUserId: userId!,
      courseId: courseId ?? "",
    })
    res.status(200).json(result)
  } catch (err) {
    handleError(err, res)
  }
})

// POST /api/enrollments/webhooks/razorpay — Razorpay signed webhook (no auth)
enrollmentRouter.post("/webhooks/razorpay", handleRazorpayWebhook)

// POST /api/enrollments/free — enroll in a free course
enrollmentRouter.post("/free", requireAuth, async (req, res) => {
  try {
    const { userId } = getAuth(req)
    const { courseId } = req.body as { courseId?: string }
    const result = await enrollFree(userId!, courseId ?? "")
    res.status(201).json(result)
  } catch (err) {
    handleError(err, res)
  }
})

// GET /api/enrollments — list enrolled courses for the authenticated student
enrollmentRouter.get("/", requireAuth, async (req, res) => {
  try {
    const { userId } = getAuth(req)
    const enrollments = await listEnrollments(userId!)
    res.status(200).json(enrollments)
  } catch (err) {
    handleError(err, res)
  }
})

// GET /api/enrollments/:courseId/status — check enrollment status for a course
enrollmentRouter.get("/:courseId/status", requireAuth, async (req, res) => {
  try {
    const { userId } = getAuth(req)
    const courseId = req.params["courseId"]!
    const status = await getEnrollmentStatus(userId!, courseId)
    res.status(200).json(status)
  } catch (err) {
    handleError(err, res)
  }
})
