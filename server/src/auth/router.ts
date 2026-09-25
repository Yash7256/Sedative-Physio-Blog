import { Router } from "express"

import { prisma } from "../lib/prisma.js"
import { handleError } from "../lib/errors.js"
import { requireAuth } from "./middleware.js"
import { registerRouter } from "./routes/register.js"
import { loginRouter } from "./routes/login.js"
import { forgotPasswordRouter } from "./routes/forgot-password.js"
import { resetPasswordRouter } from "./routes/reset-password.js"
import { verifyEmailRouter } from "./routes/verify-email.js"
import { refreshRouter } from "./routes/refresh.js"
import { logoutRouter } from "./routes/logout.js"

export const authRouter = Router()

authRouter.use("/register", registerRouter)
authRouter.use("/login", loginRouter)
authRouter.use("/forgot-password", forgotPasswordRouter)
authRouter.use("/reset-password", resetPasswordRouter)
authRouter.use("/verify-email", verifyEmailRouter)
authRouter.use("/refresh", refreshRouter)
authRouter.use("/logout", logoutRouter)

authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { email: true },
    })
    if (!user) {
      res.status(401).json({ error: "Account not found." })
      return
    }
    res.json({ userId: req.auth!.userId, role: req.auth!.role, email: user.email })
  } catch (err) {
    handleError(err, res)
  }
})
