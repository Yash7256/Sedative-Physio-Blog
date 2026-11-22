import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ClerkUserData } from "../services/webhook-verify.js"

const userFindFirst = vi.fn()
const userCreate = vi.fn()
const userUpdate = vi.fn()
const auditCreate = vi.fn()
const transaction = vi.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]))

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => userFindFirst(...args),
      create: (...args: unknown[]) => userCreate(...args),
      update: (...args: unknown[]) => userUpdate(...args),
    },
    authAuditLog: { create: (...args: unknown[]) => auditCreate(...args) },
    $transaction: (ops: unknown[]) => transaction(ops),
  },
}))

const { syncProfileFromClerk, anonymiseProfile } = await import("../services/profile-sync.js")
const { requestContext, runWithRequestContext } = await import("../context.js")

const context = { ipAddress: "203.0.113.7", userAgent: "audit-test/1.0" }

const clerkUser = (): ClerkUserData => ({
  id: "user_audit_context",
  first_name: "Ada",
  last_name: "Lovelace",
  primary_email_address_id: "idm_1",
  email_addresses: [
    { id: "idm_1", email_address: "Ada@Example.com", verification: { status: "verified" } },
  ],
  public_metadata: {},
})

beforeEach(() => {
  vi.clearAllMocks()
  userCreate.mockResolvedValue({ id: "local_1" })
  userUpdate.mockResolvedValue({})
  auditCreate.mockResolvedValue({})
})

describe("audit request context", () => {
  it("records IP and user agent on a profile-created event", async () => {
    userFindFirst.mockResolvedValue(null)

    await runWithRequestContext(context, () =>
      syncProfileFromClerk(clerkUser(), { allowCreate: true }),
    )

    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event: "profile_created",
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        }),
      }),
    )
  })

  it("records IP and user agent on an anonymisation event", async () => {
    userFindFirst.mockResolvedValueOnce({ id: "local_1" })

    await runWithRequestContext(context, () => anonymiseProfile("user_audit_context"))

    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event: "profile_anonymised",
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        }),
      }),
    )
  })

  it("does not fail profile sync when the audit write fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined)
    userFindFirst.mockResolvedValue(null)
    auditCreate.mockRejectedValueOnce(new Error("audit store unavailable"))

    await expect(
      runWithRequestContext(context, () => syncProfileFromClerk(clerkUser(), { allowCreate: true })),
    ).resolves.toEqual({
      action: "created",
      userId: "local_1",
    })

    const logged = JSON.stringify(log.mock.calls)
    log.mockRestore()
    expect(logged).toContain("audit")
    expect(logged).not.toContain(context.ipAddress)
    expect(logged).not.toContain(context.userAgent)
  })

  it("does not fail anonymisation when the audit write fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined)
    userFindFirst.mockResolvedValueOnce({ id: "local_1" })
    auditCreate.mockRejectedValueOnce(new Error("audit store unavailable"))

    await expect(
      runWithRequestContext(context, () => anonymiseProfile("user_audit_context")),
    ).resolves.toEqual({
      action: "synced",
      userId: "local_1",
    })
    log.mockRestore()
  })

  it("extracts a bounded request context from Express requests", () => {
    const req = {
      ip: "203.0.113.7",
      get: (header: string) => (header === "user-agent" ? "a".repeat(250) : undefined),
    } as never

    expect(requestContext(req)).toEqual({
      ipAddress: "203.0.113.7",
      userAgent: "a".repeat(200),
    })
  })
})
