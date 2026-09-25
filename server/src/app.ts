import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"

import { authRouter } from "./auth/router.js"
import { notesRouter } from "./notes/router.js"
import { modelsRouter } from "./models/router.js"
import { coursesRouter } from "./courses/router.js"
import { contactRouter } from "./contact/router.js"
import { paymentsRouter } from "./payments/router.js"
import { imagesRouter } from "./images/router.js"
import { healthRouter } from "./routes/health.js"

/**
 * Allowed browser origins for CORS (the refresh token is an HttpOnly cookie,
 * so credentials must be explicit). Comma-separated env var, e.g.
 *   CORS_ALLOWED_ORIGINS=https://sedativephysio.example,http://localhost:5173
 */
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

export function createApp() {
  const app = express()

  // Our cacheControl middleware owns the ETag header for cacheable GETs;
  // disable Express's built-in ETag generation so they can't collide.
  app.set("etag", false)

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

  app.use("/api/health", healthRouter)
  app.use("/api/auth", authRouter)
  app.use("/api/notes", notesRouter)
  app.use("/api/models", modelsRouter)
  app.use("/api/courses", coursesRouter)
  app.use("/api/contact", contactRouter)
  app.use("/api/payments", paymentsRouter)
  app.use("/api/images", imagesRouter)

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" })
  })

  return app
}
