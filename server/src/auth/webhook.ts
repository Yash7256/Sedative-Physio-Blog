import { Router, type Request, type Response } from "express"

import { handleError } from "../lib/errors.js"
import { anonymiseProfile, syncProfileFromClerk } from "./services/profile-sync.js"
import { verifyClerkEvent } from "./services/webhook-verify.js"

/**
 * Clerk webhook receiver. The one inbound endpoint that is not itself
 * authenticated by Clerk — the signature is the credential.
 */
export const clerkWebhookRouter = Router()

/**
 * POST /api/auth/webhooks/clerk — mirrors Clerk user state into the local
 * profile table.
 *
 * Always answers 200 for a correctly signed event, including unknown event
 * types. A non-2xx tells Clerk the delivery failed, and it will retry: a signed
 * but unrecognised event is a no-op, not an error.
 */
clerkWebhookRouter.post("/", async (req: Request, res: Response) => {
  try {
    const rawBody = readRawBody(req)
    const event = verifyClerkEvent(rawBody, req.headers)

    switch (event.type) {
      case "user.created":
      case "user.updated":
        await syncProfileFromClerk(event.data)
        break

      case "user.deleted":
        await anonymiseProfile(event.data.id)
        break

      default:
        // Forward-compatible: ignore what this app does not model yet.
        break
    }

    res.status(200).json({ received: true })
  } catch (err) {
    handleError(err, res)
  }
})

/**
 * The raw, unparsed body is required for signature verification.
 *
 * `app.ts` stashes it on the request via the `json` body-parser hook. If that
 * hook is ever removed, this throws a clear 400 instead of letting the
 * signature check fail with a confusing "invalid signature".
 */
function readRawBody(req: Request): string {
  const raw = (req as Request & { rawBody?: unknown }).rawBody
  if (typeof raw === "string" && raw.length > 0) return raw
  if (Buffer.isBuffer(raw) && raw.length > 0) return raw.toString("utf8")
  throw new Error(
    "Raw request body unavailable; the json body-parser hook in app.ts must set `rawBody` before Clerk webhooks can be verified.",
  )
}
