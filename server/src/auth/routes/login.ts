import { Router } from "express"

import { errorMessage } from "../errors.js"

function frontendApiBase(): string {
  const pk = process.env.CLERK_PUBLISHABLE_KEY ?? ""
  const prefix = "pk_test_"
  if (!pk.startsWith(prefix)) {
    throw new Error("CLERK_PUBLISHABLE_KEY must be a pk_test_ key")
  }
  const domain = Buffer.from(pk.slice(prefix.length), "base64").toString("utf8").replace(/\$$/, "")
  return `https://${domain}`
}

export const loginRouter = Router()

loginRouter.post("/", async (req, res) => {
  const { email, password } = req.body ?? {}

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" })
  }

  try {
    // Proxy to Clerk's Frontend API to create a sign-in attempt.
    const response = await fetch(`${frontendApiBase()}/v1/client/sign_ins`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CLERK_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ identifier: email, password }),
    })

    const data = (await response.json()) as {
      client?: {
        last_active_session_id: string | null
        sessions?: { status: string; last_active_token?: { jwt?: string } }[]
      }
      sign_in?: { status: string }
    }
    const errors = (data as { errors?: { message: string }[] }).errors

    if (!response.ok) {
      return res.status(400).json({ error: errors?.[0]?.message ?? "Sign in failed" })
    }

    if (data.sign_in?.status !== "complete") {
      return res
        .status(400)
        .json({ error: "Sign in requires additional verification (MFA or captcha)" })
    }

    // A completed sign-in exposes the active session and its JWT.
    const session = data.client?.sessions?.find((s) => s.status === "active")

    return res.json({
      message: "Signed in",
      userId: data.client?.last_active_session_id ?? null,
      sessionToken: session?.last_active_token?.jwt ?? null,
    })
  } catch (error) {
    return res.status(400).json({ error: errorMessage(error, "Sign in failed") })
  }
})
