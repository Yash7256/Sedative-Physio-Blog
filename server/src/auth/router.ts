import { Router } from "express"

import { clerkMiddleware, getAuth, requireAuth } from "./middleware.js"
import { webhookRouter } from "./webhook.js"
import { registerRouter } from "./routes/register.js"
import { loginRouter } from "./routes/login.js"
import { forgotPasswordRouter } from "./routes/forgot-password.js"

export const authRouter = Router()

authRouter.use(clerkMiddleware())

authRouter.use("/webhooks", webhookRouter)
authRouter.use("/register", registerRouter)
authRouter.use("/login", loginRouter)
authRouter.use("/forgot-password", forgotPasswordRouter)

authRouter.get("/me", requireAuth, (req, res) => {
  const { userId } = getAuth(req)
  res.json({ userId })
})
