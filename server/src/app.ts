import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import { clerkMiddleware } from "@clerk/express"

import { analyticsRouter } from "./analytics/router.js"
import { authRouter } from "./auth/router.js"
import { notesPublicRouter } from "./notes/router.js"
import { modelsRouter } from "./models/router.js"
import { coursesRouter } from "./courses/router.js"
import { contactRouter } from "./contact/router.js"
import { paymentsRouter } from "./payments/router.js"
import { imagesRouter } from "./images/router.js"
import { cacheRouter } from "./cache/router.js"
import { createCoursePageRouter } from "./seo/router.js"
import { healthRouter } from "./routes/health.js"
import {
  assertProductionConfig,
  getAllowedOrigins,
  getAuthorizedParties,
  getClerkPublishableKey,
} from "./auth/config.js"
import { noStore } from "./lib/cache.js"
import { errorHandler } from "./lib/errors.js"
import { timingAllowOrigin } from "./lib/timing.js"

/**
 * Allowed browser origins for CORS, normalized in auth/config so CORS,
 * Timing-Allow-Origin and production validation cannot drift apart.
 * `credentials: true` is still required: Clerk's session cookies are HttpOnly
 * and must be sent cross-origin for `getToken()` and SSR session checks to
 * work.
 */
const ALLOWED_ORIGINS = getAllowedOrigins()

export function createApp() {
  assertProductionConfig()
  const app = express()

  // Our cacheControl middleware owns the ETag header for cacheable GETs;
  // disable Express's built-in ETag generation so they can't collide.
  app.set("etag", false)

  // On Vercel every request crosses one proxy hop, so without this req.ip is
  // the shared proxy address and all visitors collide in one rate-limit bucket.
  // Trust exactly one hop rather than true: with true a client could send its
  // own X-Forwarded-For and spoof its way past the limiters.
  app.set("trust proxy", 1)

  app.use(helmet())
  app.use(
    cors({
      origin: ALLOWED_ORIGINS,
      credentials: true,
    }),
  )
  app.use(express.json({ verify: (req, _res, buf) => {
    ;(req as unknown as { rawBody: string }).rawBody = buf.toString("utf8")
  } }))
  app.use(cookieParser())

  // Caching is denied by default and granted per route. Mounted before every
  // router so a response is uncacheable unless something explicitly opts in —
  // see lib/cache.ts. The routes that opt in (courses, notes, models, images)
  // set their own Cache-Control, which replaces this value.
  app.use(noStore())
  app.use(timingAllowOrigin(ALLOWED_ORIGINS))

  // Health is mounted before Clerk on purpose: if the Clerk keys are missing or
  // wrong, every authenticated route breaks, and a health check that fails for
  // the same reason tells you nothing about whether the app is otherwise up.
  app.use("/api/health", healthRouter)

  // Public catalog reads and note previews are anonymous by design and mounted
  // before Clerk so an auth configuration change cannot gate them.
  app.use("/api/courses", coursesRouter)
  app.use("/api/models", modelsRouter)
  app.use("/api/notes", notesPublicRouter)
  // Anonymous, allowlisted product telemetry. It stays ahead of Clerk and
  // never reads the session cookie.
  app.use("/api/analytics", analyticsRouter)

  // Canonical public course URLs carry their metadata in the first HTML
  // response; anonymous by design, so this stays ahead of Clerk as well.
  app.use("/courses", createCoursePageRouter())

  // Clerk verifies the session token (header or `__session` cookie) and attaches
  // the result to `req.auth` on every request. It does not reject anonymous
  // callers — that distinction is drawn later, by `requireAuth` for protected
  // routes and by `req.auth?.userId` checks for optional-auth routes.
  app.use(clerkMiddleware({
    authorizedParties: getAuthorizedParties(),
    publishableKey: getClerkPublishableKey(),
  }))

  app.use("/api/auth", authRouter)
  app.use("/api/contact", contactRouter)
  app.use("/api/payments", paymentsRouter)
  app.use("/api/images", imagesRouter)
  app.use("/api/cache", cacheRouter)

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" })
  })

  app.use(errorHandler)

  return app
}
