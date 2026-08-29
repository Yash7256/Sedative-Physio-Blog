import { Router, type Request, type Response } from "express"
import { Webhook, type WebhookRequiredHeaders } from "svix"

import type { WebhookEvent } from "@clerk/backend"

/**
 * Verifies the svix signature and returns the Clerk webhook event, or null
 * when the signature is invalid. Placeholder until a user store exists.
 */
export function verifyWebhook(req: Request): WebhookEvent | null {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    console.warn("CLERK_WEBHOOK_SECRET is not set; skipping verification")
    return null
  }

  const headers = req.headers as unknown as WebhookRequiredHeaders
  const wh = new Webhook(secret)
  const payload = (req as unknown as { rawBody?: string }).rawBody ?? ""

  try {
    return wh.verify(payload, headers) as WebhookEvent
  } catch {
    return null
  }
}

export const webhookRouter = Router()

webhookRouter.post("/clerk", (req, res) => {
  const event = verifyWebhook(req)
  if (!event) {
    return res.status(400).json({ error: "Invalid webhook signature" })
  }

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const { id, email_addresses, first_name, last_name } = event.data
      console.log(`Syncing user ${id}:`, {
        id,
        email: email_addresses[0]?.email_address,
        first_name,
        last_name,
      })
      // TODO: upsert user into the database
      break
    }
    case "user.deleted": {
      const { id } = event.data
      console.log(`Deleting user ${id}`)
      // TODO: delete user from the database
      break
    }
    default:
      break
  }

  res.json({ received: true, type: event.type })
})
