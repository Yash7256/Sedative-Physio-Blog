import { Router } from "express"

import { meRouter } from "./routes/me.js"
import { clerkWebhookRouter } from "./webhook.js"

/**
 * Mounts the profile surface under `/api/auth`.
 *
 * There is deliberately no `/register`, `/login`, `/logout`, `/refresh`,
 * `/forgot-password`, `/reset-password` or `/verify-email` here any more. Those
 * flows belong to Clerk and are exercised through the Clerk SDK, not through
 * this API — reimplementing them would mean two authorities disagreeing about
 * who is signed in.
 *
 * What remains is the part this app owns: the local profile behind a Clerk
 * session (`/me`), and the inbound sync that keeps it current.
 */
export const authRouter = Router()

authRouter.use("/me", meRouter)
authRouter.use("/webhooks/clerk", clerkWebhookRouter)
