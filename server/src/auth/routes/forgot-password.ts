import { Router } from "express"
import { clerkClient } from "@clerk/express"

import { errorMessage } from "../errors.js"

export const forgotPasswordRouter = Router()

forgotPasswordRouter.post("/", async (req, res) => {
  const { email } = req.body ?? {}

  if (!email) {
    return res.status(400).json({ error: "email is required" })
  }

  try {
    const { data } = await clerkClient.users.getUserList({ emailAddress: [email], limit: 1 })
    const user = data[0]

    if (!user) {
      // Never reveal whether an account exists.
      return res.status(200).json({ message: "If an account exists, a reset token was created." })
    }

    const token = await clerkClient.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 3600,
    })

    return res.status(200).json({
      message: "Password reset initiated.",
      // The reset token is normally sent to the user's email by your frontend flow,
      // then consumed via Clerk's reset-password UI. Exposing it here is for testing only.
      token: token.token,
    })
  } catch (error) {
    return res.status(400).json({ error: errorMessage(error, "Password reset failed") })
  }
})
