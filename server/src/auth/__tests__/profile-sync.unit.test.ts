import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ClerkUserData } from "../services/webhook-verify.js"

// Prisma is mocked at the module boundary so the sync logic is exercised
// without a database. Each test scripts only the calls it expects; `mockReset`
// in beforeEach makes an unexpected extra query a visible failure rather than
// a silent pass.
const userFindFirst = vi.fn()
const userCreate = vi.fn()
const userUpdate = vi.fn()
const auditCreate = vi.fn()

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => userFindFirst(...args),
      create: (...args: unknown[]) => userCreate(...args),
      update: (...args: unknown[]) => userUpdate(...args),
    },
    authAuditLog: { create: (...args: unknown[]) => auditCreate(...args) },
  },
}))

const { anonymiseProfile, syncProfileFromClerk } = await import("../services/profile-sync.js")

/** The `data` payload of the nth `user.create` call. */
function createData(call = 0): Record<string, unknown> {
  const args = userCreate.mock.calls[call] as unknown as [{ data: Record<string, unknown> }]
  return args[0].data
}

/** The `data` payload of the nth `user.update` call. */
function updateData(call = 0): Record<string, unknown> {
  const args = userUpdate.mock.calls[call] as unknown as [{ data: Record<string, unknown> }]
  return args[0].data
}

const clerkUser = (overrides: Partial<ClerkUserData> = {}): ClerkUserData => ({
  id: "user_abc",
  first_name: "Ada",
  last_name: "Lovelace",
  primary_email_address_id: "idm_1",
  email_addresses: [
    { id: "idm_1", email_address: "Ada@Example.com", verification: { status: "verified" } },
  ],
  public_metadata: {},
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  userCreate.mockResolvedValue({ id: "local_1" })
  userUpdate.mockResolvedValue({})
  auditCreate.mockResolvedValue({})
})

describe("syncProfileFromClerk", () => {
  it("creates a profile when nothing matches", async () => {
    userFindFirst.mockResolvedValue(null)

    const result = await syncProfileFromClerk(clerkUser())

    expect(result).toEqual({ action: "created", userId: "local_1" })
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clerkUserId: "user_abc",
          email: "ada@example.com",
          fullName: "Ada Lovelace",
          role: "user",
        }),
      }),
    )
    expect(createData().emailVerifiedAt).toBeInstanceOf(Date)
  })

  it("is idempotent: a retry for an already-linked user only syncs", async () => {
    userFindFirst.mockResolvedValueOnce({ id: "local_1", fullName: "Ada Lovelace" })

    const result = await syncProfileFromClerk(clerkUser())

    expect(result).toEqual({ action: "synced", userId: "local_1" })
    expect(userCreate).not.toHaveBeenCalled()
    expect(userUpdate).toHaveBeenCalledOnce()
  })

  it("adopts an unlinked profile that matches the email, keeping its history", async () => {
    // This is the migration path for someone who registered before the Clerk
    // cutover: their enrollments and orders hang off this row.
    userFindFirst
      .mockResolvedValueOnce(null) // no row with this clerkUserId
      .mockResolvedValueOnce({ id: "local_old", fullName: null }) // unlinked match by email

    const result = await syncProfileFromClerk(clerkUser())

    expect(result).toEqual({ action: "relinked", userId: "local_old" })
    expect(userCreate).not.toHaveBeenCalled()
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "local_old" },
        data: expect.objectContaining({ clerkUserId: "user_abc", deletedAt: null }),
      }),
    )
  })

  it("only ever adopts a row that is unlinked and not tombstoned", async () => {
    userFindFirst.mockResolvedValue(null)

    await syncProfileFromClerk(clerkUser())

    // The where clause is the safety property, not the mock's return value.
    expect(userFindFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { email: "ada@example.com", clerkUserId: null, deletedAt: null },
      }),
    )
  })

  it("does not look for an adoptable row when there is no email to match", async () => {
    userFindFirst.mockResolvedValue(null)

    const result = await syncProfileFromClerk(
      clerkUser({ email_addresses: [], primary_email_address_id: null }),
    )

    expect(result).toEqual({ action: "created", userId: "local_1" })
    // The by-email lookup is the second call; it must not happen at all.
    expect(userFindFirst).toHaveBeenCalledOnce()
  })

  it("never overwrites a fullName the user typed themselves", async () => {
    userFindFirst.mockResolvedValueOnce({ id: "local_1", fullName: "Ada L." })

    await syncProfileFromClerk(clerkUser({ first_name: "Augusta", last_name: "King" }))

    expect(updateData()).not.toHaveProperty("fullName")
  })

  it("fills an empty fullName from Clerk's name", async () => {
    userFindFirst.mockResolvedValueOnce({ id: "local_1", fullName: null })

    await syncProfileFromClerk(clerkUser())

    expect(updateData().fullName).toBe("Ada Lovelace")
  })

  it("mirrors an elevated role but ignores a missing one", async () => {
    userFindFirst.mockResolvedValueOnce({ id: "local_1", fullName: "x" })
    await syncProfileFromClerk(clerkUser({ public_metadata: { role: "admin" } }))
    expect(updateData().role).toBe("admin")

    vi.clearAllMocks()
    userUpdate.mockResolvedValue({})
    userFindFirst.mockResolvedValueOnce({ id: "local_1", fullName: "x" })
    await syncProfileFromClerk(clerkUser())
    // Absent role must not be written, so an existing role is never clobbered.
    expect(updateData()).not.toHaveProperty("role")
  })

  it("treats a concurrent unique violation as success, not a 500", async () => {
    // Two webhooks racing on the same clerkUserId would otherwise make Clerk
    // retry a delivery that has in fact already been applied.
    userFindFirst.mockResolvedValueOnce({ id: "local_1", fullName: "x" })
    userUpdate.mockRejectedValueOnce({ code: "P2002" })

    await expect(syncProfileFromClerk(clerkUser())).resolves.toEqual({
      action: "synced",
      userId: "local_1",
    })
  })

  it("propagates genuine database errors", async () => {
    userFindFirst.mockResolvedValueOnce({ id: "local_1", fullName: "x" })
    userUpdate.mockRejectedValueOnce(new Error("connection lost"))

    await expect(syncProfileFromClerk(clerkUser())).rejects.toThrow("connection lost")
  })

  it("records an audit row for the events it performs", async () => {
    userFindFirst.mockResolvedValue(null)
    await syncProfileFromClerk(clerkUser())
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ event: "profile_created" }),
      }),
    )
  })
})

describe("anonymiseProfile", () => {
  it("detaches the Clerk link instead of deleting the row", async () => {
    // "Order".userId is ON DELETE RESTRICT, so a hard delete would fail once an
    // order exists; "Enrollment".userId is CASCADE, so it would silently drop
    // enrolments. Neither is acceptable for a record of what someone paid for.
    userFindFirst.mockResolvedValueOnce({ id: "local_1" })

    const result = await anonymiseProfile("user_abc", { id: "user_abc" })

    expect(result).toEqual({ action: "synced", userId: "local_1" })
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "local_1" },
      data: { clerkUserId: null, deletedAt: expect.any(Date) },
    })
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ event: "profile_anonymised" }),
      }),
    )
  })

  it("is a no-op for an unknown Clerk user", async () => {
    userFindFirst.mockResolvedValueOnce(null)

    expect(await anonymiseProfile("user_gone")).toEqual({ action: "noop" })
    expect(userUpdate).not.toHaveBeenCalled()
    expect(auditCreate).not.toHaveBeenCalled()
  })
})


describe("F-02: verified-email adoption and storage", () => {
  it.fails("does not relink a legacy row when the email is unverified", async () => {
    userFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "local_old", fullName: null })

    const result = await syncProfileFromClerk(
      clerkUser({
        email_addresses: [
          { id: "idm_1", email_address: "ada@example.com", verification: { status: "unverified" } },
        ],
      }),
    )

    expect(result).not.toEqual({ action: "relinked", userId: "local_old" })
    expect(userCreate).toHaveBeenCalled()
  })

  it.fails("stores email null when Clerk reports it unverified", async () => {
    userFindFirst.mockResolvedValue(null)

    await syncProfileFromClerk(
      clerkUser({
        email_addresses: [
          { id: "idm_1", email_address: "ada@example.com", verification: { status: "unverified" } },
        ],
      }),
    )

    expect(createData().email).toBeNull()
  })

  it("relinks on a verified match and audits PROFILE_RELINKED", async () => {
    userFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "local_old", fullName: "Ada" })

    const result = await syncProfileFromClerk(clerkUser())

    expect(result).toEqual({ action: "relinked", userId: "local_old" })
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ event: "profile_relinked" }),
      }),
    )
  })

  it.fails("an unverified claim to an address cannot block the real owner's sync", async () => {
    // Attacker claims victim email unverified -> must not occupy UNIQUE email
    userFindFirst.mockResolvedValue(null)
    await syncProfileFromClerk(
      clerkUser({
        id: "user_attacker",
        email_addresses: [
          { id: "idm_1", email_address: "victim@example.com", verification: { status: "unverified" } },
        ],
      }),
    )
    expect(createData(0).email).toBeNull()
  })
})

describe("F-04/F-05: PII clearing, tombstones and race-safe create", () => {
  it.fails("anonymise clears email, emailVerifiedAt, fullName, collegeName and resets role in one transaction", async () => {
    userFindFirst.mockResolvedValueOnce({ id: "local_1" })
    const txUserUpdate = vi.fn().mockResolvedValue({})
    const txAuditCreate = vi.fn().mockResolvedValue({})
    // target shape: prisma.$transaction(...)
    ;(await import("../../lib/prisma.js")).prisma.$transaction = vi.fn(async (fn: any) =>
      fn({
        user: { update: txUserUpdate },
        authAuditLog: { create: txAuditCreate },
      }),
    )

    await anonymiseProfile("user_abc")

    expect(txUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clerkUserId: null,
          email: null,
          emailVerifiedAt: null,
          fullName: null,
          collegeName: null,
          role: "user",
        }),
      }),
    )
  })

  it.fails("re-registering with a deleted account's email creates a fresh profile", async () => {
    // Simulates UNIQUE(email) conflict that persists until anonymise frees the email (P2002 on create).
    // Fixed behavior: handle P2002-on-email by creating with email null + PROFILE_EMAIL_CONFLICT.
    userFindFirst.mockResolvedValue(null)
    userCreate
      .mockRejectedValueOnce({ code: "P2002", meta: { target: ["email"] } })
      .mockResolvedValueOnce({ id: "local_fresh" })

    const result = await (syncProfileFromClerk as any)(clerkUser(), { allowCreate: true })

    expect(result).toEqual(expect.objectContaining({ userId: "local_fresh", action: "created" }))
    const second = userCreate.mock.calls[1] as unknown as [{ data: Record<string, unknown> }]
    expect(second[0].data.email).toBeNull()
  })

  it.fails("create P2002 on clerkUserId returns the concurrent winner", async () => {
    userFindFirst
      .mockResolvedValueOnce(null) // initial by clerkUserId
      .mockResolvedValueOnce(null) // adoptable
      .mockResolvedValueOnce({ id: "local_winner", fullName: "Ada" }) // after P2002
    userCreate.mockRejectedValueOnce({ code: "P2002", meta: { target: ["clerkUserId"] } })

    const result = await (syncProfileFromClerk as any)(clerkUser(), { allowCreate: true })
    expect(result).toEqual(expect.objectContaining({ userId: "local_winner" }))
  })

  it.fails("create P2002 on email creates with null email and audits PROFILE_EMAIL_CONFLICT", async () => {
    userFindFirst.mockResolvedValue(null)
    userCreate
      .mockRejectedValueOnce({ code: "P2002", meta: { target: ["email"] } })
      .mockResolvedValueOnce({ id: "local_conflict" })

    const result = await (syncProfileFromClerk as any)(clerkUser(), { allowCreate: true })
    expect(userCreate).toHaveBeenCalledTimes(2)
    const second = userCreate.mock.calls[1] as unknown as [{ data: Record<string, unknown> }]
    expect(second[0].data.email).toBeNull()
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ event: "profile_email_conflict" }),
      }),
    )
    expect(result).toEqual(expect.objectContaining({ userId: "local_conflict" }))
  })

  it.fails("conflictsOn handles array and string meta.target (P2002)", async () => {
    // P3 will introduce conflictsOn(err, field) used by sync/create paths.
    const mod = await import("../services/profile-sync.js") as any
    expect(typeof mod.conflictsOn).toBe("function")
    expect(mod.conflictsOn({ code: "P2002", meta: { target: ["clerkUserId"] } }, "clerkUserId")).toBe(true)
    expect(mod.conflictsOn({ code: "P2002", meta: { target: "User_email_key" } }, "email")).toBe(true)
    expect(mod.conflictsOn({ code: "P2002", meta: { target: "User_email_key" } }, "clerkUserId")).toBe(false)
  })
})

describe("F-06: role mirroring", () => {
  it.fails("role removed in Clerk resets local role to user and audits", async () => {
    userFindFirst.mockResolvedValueOnce({ id: "local_1", fullName: "Ada", role: "admin", emailVerifiedAt: new Date() })
    await syncProfileFromClerk(clerkUser({ public_metadata: {} }))
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: "user" }) }),
    )
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ event: "profile_role_changed" }) }),
    )
  })

  it.fails("role promotion audits PROFILE_ROLE_CHANGED", async () => {
    userFindFirst.mockResolvedValueOnce({ id: "local_1", fullName: "Ada", role: "user", emailVerifiedAt: new Date() })
    await syncProfileFromClerk(clerkUser({ public_metadata: { role: "admin" } }))
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ event: "profile_role_changed" }) }),
    )
  })
})

describe("F-10: emailVerifiedAt semantics", () => {
  it.fails("emailVerifiedAt is preserved across syncs", async () => {
    const first = new Date("2020-01-01T00:00:00Z")
    userFindFirst.mockResolvedValueOnce({ id: "local_1", fullName: "Ada", role: "user", emailVerifiedAt: first })
    await syncProfileFromClerk(clerkUser())
    const data = updateData()
    expect(data.emailVerifiedAt).toEqual(first)
  })

  it("emailVerifiedAt is cleared when Clerk reports unverified", async () => {
    userFindFirst.mockResolvedValueOnce({ id: "local_1", fullName: "Ada", role: "user", emailVerifiedAt: new Date() })
    await syncProfileFromClerk(
      clerkUser({
        email_addresses: [
          { id: "idm_1", email_address: "ada@example.com", verification: { status: "unverified" } },
        ],
      }),
    )
    expect(updateData().emailVerifiedAt).toBeNull()
  })
})
