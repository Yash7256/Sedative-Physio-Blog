import express from "express"
import cors from "cors"

import { authRouter } from "./auth/router.js"
import { healthRouter } from "./routes/health.js"

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json({ verify: (req, _res, buf) => {
    ;(req as unknown as { rawBody: string }).rawBody = buf.toString("utf8")
  } }))

  app.use("/api/health", healthRouter)
  app.use("/api/auth", authRouter)

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" })
  })

  return app
}
