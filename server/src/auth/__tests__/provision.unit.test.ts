import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Just-in-time provisioning: a valid Clerk session with no local row should end
 * up with a real profile, name and all, rather than an empty screen.
 *
 * The webhook is the fast path but cannot be relied on — it needs a publicly
 * reachable URL, so every local OAuth sign-in misses it — so this path is the one
 * that actually runs during development. It runs the *same* sync the webhook
 * runs, which is why these tests use a real fake store instead of stubbing the
 * sync: the interesting behaviour is the interaction between Clerk's payload,
 * the adoption rules and the row.
 */

interface Row {
  id: string
  clerkUserId: string | null
  email: string | null
  fullName: string | null
  collegeName: string | null
  role: string
  emailVerifiedAt: Date | null
  deletedAt: Date | null
}

let rows: Row[] = []
let nextId = 1
const auditEvents: string[] = []

/** Enough Prisma to satisfy the three readers that touch `user`. */
const userFindFirst = vi.fn(async (args: { where: Record<string, unknown>; select?: Record<string, boolean> }) => {
  const match = rows.find((row) => matches(row, args.where))
  return match ? pick(match, args.select) : null
})

const userCreate = vi.fn(async (args: { data: Partial<Row> }) => {
  const row: Row = {
    id: `local_${nextId++}`,
    clerkUserId: null,
    email: null,
    fullName: null,
    collegeName: null,
    role: "user",
    emailVerifiedAt: null,
    deletedAt: null,
    ...args.data,
  }
  rows.push(row)
  return row
})

const userUpdate = vi.fn(async (args: { where: { id: string }; data: Partial<Row> }) => {
  const row = rows.find((r) => r.id === args.where.id)
  if (!row) throw Object.assign(new Error("not found"), { code: "P2025" })
  Object.assign(row, args.data)
  return row
})

const authAuditLogCreate = vi.fn(async (args: { data: { event: string } }) => {
  auditEvents.push(args.data.event)
  return args.data
})

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findFirst: (...a: unknown[]) => userFindFirst(...(a as [never])),
      create: (...a: unknown[]) => userCreate(...(a as [never])),
      update: (...a: unknown[]) => userUpdate(...(a as [never])),
    },
    authAuditLog: { create: (...a: unknown[]) => authAuditLogCreate(...(a as [never])) },
  },
}))

const clerkGetUser = vi.fn()
vi.mock("../../lib/clerk.js", () => ({
  getClerkClient: () => ({ users: { getUser: (...a: unknown[]) => clerkGetUser(...(a as [never])) } }),
}))

const { ensureAuthProfile } = await import("../services/provision.js")

const CLERK_ID = "user_2provision"

/** A Clerk user shaped like a real Google OAuth sign-in. */
function googleUser(overrides: Record<string, unknown> = {}) {
  return {
    id: CLERK_ID,
    object: "user",
    firstName: "Aman",
    lastName: "Raj",
    primaryEmailAddressId: "idn_email_1",
    emailAddresses: [
      { id: "idn_email_1", emailAddress: "Aman.Raj@example.com", verification: { status: "verified" } },
    ],
    publicMetadata: {},
    ...overrides,
  }
}

function matches(row: Row, where: Record<string, unknown>): boolean {
  if (typeof where.clerkUserId === "string" && row.clerkUserId !== where.clerkUserId) return false
  if (where.clerkUserId === null && row.clerkUserId !== null) return false
  if (where.email !== undefined && row.email !== where.email) return false
  if ("deletedAt" in where) {
    const want = where.deletedAt
    if (want === null && row.deletedAt !== null) return false
    if (want && typeof want === "object" && (want as { not: null }).not === null && row.deletedAt === null) {
      return false
    }
  }
  return true
}

function pick(row: Row, select?: Record<string, boolean>): Partial<Row> {
  if (!select) return { ...row }
  const out: Record<string, unknown> = {}
  for (const [key, wanted] of Object.entries(select)) if (wanted) out[key] = row[key as keyof Row]
  return out as Partial<Row>
}

beforeEach(() => {
  vi.clearAllMocks()
  rows = []
  nextId = 1
  auditEvents.length = 0
  clerkGetUser.mockResolvedValue(googleUser())
})

describe("ensureAuthProfile", () => {
  it("returns the existing profile without troubling Clerk", async () => {
    rows.push({
      id: "local_existing",
      clerkUserId: CLERK_ID,
      email: "aman@example.com",
      fullName: "Aman Raj",
      collegeName: null,
      role: "user",
      emailVerifiedAt: new Date(),
      deletedAt: null,
    })

    const profile = await ensureAuthProfile(CLERK_ID)

    expect(profile?.fullName).toBe("Aman Raj")
    // The happy path must stay free: this runs on every authenticated request.
    expect(clerkGetUser).not.toHaveBeenCalled()
  })

  it("creates the profile from Clerk, name included, when no row exists", async () => {
    const profile = await ensureAuthProfile(CLERK_ID)

    expect(clerkGetUser).toHaveBeenCalledWith(CLERK_ID)
    // This is the bug being fixed: Google had the name the whole time and the
    // app showed nothing, because the row it read from did not exist.
    expect(profile).toMatchObject({
      clerkUserId: CLERK_ID,
      fullName: "Aman Raj",
      email: "aman.raj@example.com",
      emailVerified: true,
    })
    expect(rows).toHaveLength(1)
    expect(auditEvents).toContain("profile_created")
  })

  it("adopts a pre-Clerk row with the same email instead of orphaning it", async () => {
    // Someone who enrolled before the Clerk cutover. A fresh row would leave
    // their orders and enrollments on a row nobody ever signs in to.
    rows.push({
      id: "local_legacy",
      clerkUserId: null,
      email: "aman.raj@example.com",
      fullName: "Aman R.",
      collegeName: "King's College",
      role: "user",
      emailVerifiedAt: null,
      deletedAt: null,
    })

    const profile = await ensureAuthProfile(CLERK_ID)

    expect(rows).toHaveLength(1)
    expect(profile?.userId).toBe("local_legacy")
    expect(rows[0]?.clerkUserId).toBe(CLERK_ID)
    // Collected by the user in this app, so a Clerk rename must not erase it.
    expect(rows[0]?.collegeName).toBe("King's College")
  })

  it("leaves a name the user already typed alone", async () => {
    rows.push({
      id: "local_named",
      clerkUserId: CLERK_ID,
      email: "aman.raj@example.com",
      fullName: "Aman R. Singh",
      collegeName: null,
      role: "user",
      emailVerifiedAt: new Date(),
      deletedAt: null,
    })

    await ensureAuthProfile(CLERK_ID)

    expect(rows[0]?.fullName).toBe("Aman R. Singh")
  })

  it("returns null when Clerk no longer has the user", async () => {
    clerkGetUser.mockRejectedValue(Object.assign(new Error("not found"), { status: 404 }))

    await expect(ensureAuthProfile(CLERK_ID)).resolves.toBeNull()
    expect(rows).toHaveLength(0)
  })

  it("returns null rather than reviving a deleted account", async () => {
    rows.push({
      id: "local_dead",
      clerkUserId: CLERK_ID,
      email: "aman.raj@example.com",
      fullName: "Aman Raj",
      collegeName: null,
      role: "user",
      emailVerifiedAt: new Date(),
      deletedAt: new Date(),
    })

    await expect(ensureAuthProfile(CLERK_ID)).resolves.toBeNull()
    // A person who deletes their account and signs in again gets a clean
    // profile, not the previous one's enrollments.
    expect(clerkGetUser).not.toHaveBeenCalled()
  })

  it("lets a Clerk outage surface as an error, not as a missing account", async () => {
    clerkGetUser.mockRejectedValue(new Error("socket hang up"))

    // Swallowing this as "no such user" would be a permanent 401 the user can do
    // nothing about, and would look identical to a deleted account.
    await expect(ensureAuthProfile(CLERK_ID)).rejects.toThrow(/socket hang up/)
  })

  it("treats a Google user with no name as a profile without one", async () => {
    clerkGetUser.mockResolvedValue(googleUser({ firstName: null, lastName: null }))

    const profile = await ensureAuthProfile(CLERK_ID)

    // Inventing a name from the email would be worse than admitting there isn't
    // one; the UI falls back to the email.
    expect(profile?.fullName).toBeNull()
    expect(profile?.email).toBe("aman.raj@example.com")
  })
})
