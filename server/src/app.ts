import express from "express"
import cors from "cors"

import { authRouter } from "./auth/router.js"
import { enrollmentRouter } from "./enrollments/router.js"
import { notesRouter } from "./notes/router.js"
import { modelsRouter } from "./models/router.js"
import { coursesRouter } from "./courses/router.js"
import { contactRouter } from "./contact/router.js"
import { healthRouter } from "./routes/health.js"

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json({ verify: (req, _res, buf) => {
    ;(req as unknown as { rawBody: string }).rawBody = buf.toString("utf8")
  } }))

  app.use("/api/health", healthRouter)
  app.use("/api/auth", authRouter)
  app.use("/api/enrollments", enrollmentRouter)
  app.use("/api/notes", notesRouter)
  app.use("/api/models", modelsRouter)
  app.use("/api/courses", coursesRouter)
  app.use("/api/contact", contactRouter)

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" })
  })

  return app
}
