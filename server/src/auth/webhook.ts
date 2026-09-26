import { Router, type Request, type Response } from "express"
import rateLimit from "express-rate-limit"

import { handleError } from "../lib/errors.js"
import { anonymiseProfile, syncProfileFromClerk } from "./services/profile-sync.js"
import { classifyClerkEvent, verifyClerkEvent } from "./services/webhook-verify.js"

/**
 * Clerk webhook receiver. The one inbound endpoint that is not itself
 * authenticated by Clerk — the signature is the credential.
 */
export const clerkWebhookRouter = Router()

const WINDOW_MS = 60 * 1000

/**
 * A flood guard, deliberately far above any real delivery rate.
 *
 * The threat is not forgery — the signature stops that — it is that every
 * inbound request costs an HMAC verification and a JSON parse whether or not
 * it is legitimate, so an unauthenticated caller can spend server CPU for free.
 * Limiting here, ahead of `verifyClerkEvent`, is what makes that expensive.
 *
 * The ceiling is set high on purpose. Clerk retries on non-2xx and bursts on
 * bulk changes and dashboard test events, so a limit tight enough to matter
 * against an attacker would also 429 a legitimate burst, and each 429 provokes
 * more deliveries. At this ceiling normal traffic never reaches it; a flood is
 * still cut off quickly. 429 is retryable and Clerk backs off, so the limit
 * clears itself.
 */
const deliveryLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many webhook deliveries. Please retry." },
})

/**
 * POST /api/auth/webhooks/clerk — mirrors Clerk user state into the local
 * profile table.
 *
 * Always answers 200 for a correctly signed event, including unknown event
 * types and payloads too malformed to act on. A non-2xx tells Clerk the
 * delivery failed and it will retry: a signed but unrecognised or unusable
 * event is a no-op, not an error, and retrying it can never succeed. The
 * response body names the reason so the drop is visible in Clerk's logs.
 */
clerkWebhookRouter.post("/", deliveryLimiter, async (req: Request, res: Response) => {
  try {
    const rawBody = readRawBody(req)
    const event = classifyClerkEvent(verifyClerkEvent(rawBody, req.headers))

    switch (event.kind) {
      case "upsert":
        await syncProfileFromClerk(event.data)
        break

      case "delete":
        await anonymiseProfile(event.clerkUserId)
        break

      case "ignore":
        // Authenticated but not actionable. Warned rather than swallowed: the
        // response is 200, so nothing else would surface this.
        console.warn("Clerk webhook ignored:", event.reason)
        break
    }

    res.status(200).json(
      event.kind === "ignore"
        ? { received: true, ignored: event.reason }
        : { received: true },
    )
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
