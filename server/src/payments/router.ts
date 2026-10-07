import { Router } from "express"
import { getAuthProfile, resolveLocalUserId } from "../auth/services/me.js"
import { readAuthUserId as readClerkUserId } from "../lib/clerk.js"
import { BadRequestError, handleError, UnauthorizedError } from "../lib/errors.js"
import {
  createRazorpayOrder,
  enrollFreeCourses,
  getPaymentConfig,
  getUserEnrollments,
  getUserOrders,
  processRazorpayWebhook,
  verifyRazorpayPayment,
} from "./service.js"

export const paymentsRouter = Router()

// No `requireAuth` here: `clerkMiddleware()` in app.ts already populates
// `req.auth` for every request, and it never rejects anonymous callers. These
// routes are optional-auth — they resolve the caller and degrade to "not signed
// in" rather than 401.
//
// `resolveLocalUserId` is the boundary translation. `req.auth().userId` is
// Clerk's `user_…`, but Order/Enrollment carry a foreign key to the local
// `User.id` cuid. Passing Clerk's id straight through reads as "no enrollments"
// (the query matches nothing) and writes as a foreign key violation, so every
// caller below receives a local row id or null.

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
    const localUserId = await resolveLocalUserId(readClerkUserId(req))
    if (!localUserId) {
      res.status(200).json([])
      return
    }
    const courseIds = await getUserEnrollments(localUserId)
    res.status(200).json(courseIds)
  } catch (err) {
    handleError(err, res)
  }
})

// GET /api/payments/my-orders — the caller's own order history
paymentsRouter.get("/my-orders", async (req, res) => {
  try {
    const localUserId = await resolveLocalUserId(readClerkUserId(req))
    if (!localUserId) {
      res.status(200).json([])
      return
    }
    res.status(200).json(await getUserOrders(localUserId))
  } catch (err) {
    handleError(err, res)
  }
})

// POST /api/payments/create-order — creates or reuses a Razorpay order
paymentsRouter.post("/create-order", async (req, res) => {
  try {
    const { courseIds } = req.body
    const clerkUserId = readClerkUserId(req)
    const localUserId = await resolveLocalUserId(clerkUserId)

    if (!localUserId) {
      throw new UnauthorizedError("Please sign in to purchase")
    }

    // The order's `userEmail`/`userName` mirror the signed-in account rather than
    // the request body. Taken from the body they were whatever the client chose
    // to send — an anonymous caller could put any name on any order, and the
    // record is what a support query or a refund would be read from. The profile
    // is already resolved for the foreign key, so this costs no extra lookup.
    const profile = clerkUserId ? await getAuthProfile(clerkUserId) : null

    const order = await createRazorpayOrder({
      courseIds,
      localUserId,
      userEmail: profile?.email ?? null,
      userName: profile?.fullName ?? null,
    })

    res.status(200).json(order)
  } catch (err) {
    handleError(err, res)
  }
})

// POST /api/payments/verify — verifies payment signature and registers enrollment atomically
paymentsRouter.post("/verify", async (req, res) => {
  try {
    const localUserId = await resolveLocalUserId(readClerkUserId(req))

    if (!localUserId) {
      throw new UnauthorizedError("Please sign in to verify payment")
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

    const result = await verifyRazorpayPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      localUserId,
    })

    res.status(200).json(result)
  } catch (err) {
    handleError(err, res)
  }
})

// POST /api/payments/free-enroll — enrolls logged-in user in free course(s)
paymentsRouter.post("/free-enroll", async (req, res) => {
  try {
    // Unlike the read paths above this one must reject: a free enrollment with
    // no owner would be a row nobody can ever see or revoke.
    const localUserId = await resolveLocalUserId(readClerkUserId(req))
    if (!localUserId) {
      throw new UnauthorizedError("Please sign in to enroll in this course")
    }

    const { courseIds } = req.body
    const result = await enrollFreeCourses({
      courseIds,
      localUserId,
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
