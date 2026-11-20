import { beforeEach, describe, expect, it, vi } from "vitest"

const syncProfileFromClerk = vi.fn()
const anonymiseProfile = vi.fn()
const ensureAuthProfile = vi.fn()
const classifyClerkEvent = vi.fn()
const verifyClerkEvent = vi.fn()

vi.mock("../services/profile-sync.js", () => ({
  syncProfileFromClerk: (...args: unknown[]) => syncProfileFromClerk(...args),
  anonymiseProfile: (...args: unknown[]) => anonymiseProfile(...args),
}))

vi.mock("../services/provision.js", () => ({
  ensureAuthProfile: (...args: unknown[]) => ensureAuthProfile(...args),
}))

vi.mock("../services/webhook-verify.js", () => ({
  classifyClerkEvent: (...args: unknown[]) => classifyClerkEvent(...args),
  verifyClerkEvent: (...args: unknown[]) => verifyClerkEvent(...args),
}))

const { clerkWebhookRouter } = await import("../webhook.js")

import express from "express"
import { withServer } from "../../test/harness.js"

function app() {
  const app = express()
  app.use(express.json({ verify: (req, _res, buf) => {
    ;(req as unknown as { rawBody: string }).rawBody = buf.toString("utf8")
  } }))
  app.use("/webhook", clerkWebhookRouter)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
  verifyClerkEvent.mockImplementation((body) => JSON.parse(body))
})

describe("webhook dispatch order (ORDER)", () => {
  it.fails("user.updated for an unknown user is a no-op", async () => {
    classifyClerkEvent.mockReturnValue({
      kind: "upsert",
      eventType: "user.updated",
      data: { id: "user_x", email_addresses: [] },
    })
    syncProfileFromClerk.mockResolvedValue({ action: "noop" })

    const res = await withServer(app(), (baseUrl) =>
      fetch(`${baseUrl}/webhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "user.updated", data: { id: "user_x" } }),
      }),
    )

    expect(res.status).toBe(200)
    expect(syncProfileFromClerk).toHaveBeenCalledWith(expect.anything(), { allowCreate: false })
    expect(ensureAuthProfile).not.toHaveBeenCalled()
  })

  it.fails("user.created for an unknown user creates only via a fresh Clerk read", async () => {
    classifyClerkEvent.mockReturnValue({
      kind: "upsert",
      eventType: "user.created",
      data: { id: "user_new", email_addresses: [] },
    })
    syncProfileFromClerk.mockResolvedValue({ action: "noop" })
    ensureAuthProfile.mockResolvedValue({ userId: "local_new" })

    const res = await withServer(app(), (baseUrl) =>
      fetch(`${baseUrl}/webhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "user.created", data: { id: "user_new" } }),
      }),
    )

    expect(res.status).toBe(200)
    expect(ensureAuthProfile).toHaveBeenCalledWith("user_new")
  })

  it.fails("user.created for a user Clerk 404s returns 200 and creates nothing", async () => {
    classifyClerkEvent.mockReturnValue({
      kind: "upsert",
      eventType: "user.created",
      data: { id: "user_gone", email_addresses: [] },
    })
    syncProfileFromClerk.mockResolvedValue({ action: "noop" })
    ensureAuthProfile.mockResolvedValue(null)

    const res = await withServer(app(), (baseUrl) =>
      fetch(`${baseUrl}/webhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "user.created", data: { id: "user_gone" } }),
      }),
    )

    expect(res.status).toBe(200)
    expect(syncProfileFromClerk).toHaveBeenCalledWith(expect.anything(), { allowCreate: false })
    expect(ensureAuthProfile).toHaveBeenCalledWith("user_gone")
  })
})
