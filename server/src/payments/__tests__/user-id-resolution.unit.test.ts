import { beforeEach, describe, expect, it, vi } from "vitest"

// Prisma is mocked at the module boundary, so the id translation is exercised
// without a database. The point of these tests is the *shape* of the lookup: a
// caller that hands Clerk's id to a foreign key either reads nothing or trips a
// constraint, and both failures stay silent until somebody tries to buy
// something.
const userFindFirst = vi.fn()
const enrollmentFindMany = vi.fn()
const orderFindMany = vi.fn()

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: { findFirst: (...args: unknown[]) => userFindFirst(...args) },
    enrollment: { findMany: (...args: unknown[]) => enrollmentFindMany(...args) },
    order: { findMany: (...args: unknown[]) => orderFindMany(...args) },
  },
}))

// Provisioning is mocked so this file stays about id translation; the
// provisioning itself is covered in `auth/__tests__/provision.unit.test.ts`.
const ensureAuthProfile = vi.fn()
vi.mock("../../auth/services/provision.js", () => ({
  ensureAuthProfile: (...args: unknown[]) => ensureAuthProfile(...args),
}))

const { resolveLocalUserId } = await import("../../auth/services/me.js")
const { getUserEnrollments, getUserOrders } = await import("../service.js")

const CLERK_ID = "user_2abcLocalLookup"
const LOCAL_ID = "cmuiojrf80000xbi102lain8k"

beforeEach(() => {
  vi.clearAllMocks()
  userFindFirst.mockResolvedValue({ id: LOCAL_ID })
  ensureAuthProfile.mockResolvedValue(null)
  enrollmentFindMany.mockResolvedValue([{ courseId: "course_a" }])
  orderFindMany.mockResolvedValue([])
})

describe("resolveLocalUserId", () => {
  it("maps a Clerk user id to the local row id", async () => {
    await expect(resolveLocalUserId(CLERK_ID)).resolves.toBe(LOCAL_ID)
  })

  it("looks the row up by clerkUserId, excluding tombstoned rows", async () => {
    await resolveLocalUserId(CLERK_ID)

    expect(userFindFirst).toHaveBeenCalledWith({
      where: { clerkUserId: CLERK_ID, deletedAt: null },
      select: { id: true },
    })
  })

  it.each([null, undefined, ""])("returns null for %p without querying", async (input) => {
    await expect(resolveLocalUserId(input)).resolves.toBeNull()
    expect(userFindFirst).not.toHaveBeenCalled()
  })

  it("provisions from Clerk when the webhook never delivered a row", async () => {
    // A first purchase moments after a Google sign-in lands here. Refusing would
    // create an order nobody can be credited to, and the row it was waiting for
    // is the very thing that is missing.
    userFindFirst.mockResolvedValue(null)
    ensureAuthProfile.mockResolvedValue({ userId: LOCAL_ID })

    await expect(resolveLocalUserId(CLERK_ID)).resolves.toBe(LOCAL_ID)
    expect(ensureAuthProfile).toHaveBeenCalledWith(CLERK_ID)
  })

  it("returns null when Clerk has no such user, so writes can refuse", async () => {
    userFindFirst.mockResolvedValue(null)
    ensureAuthProfile.mockResolvedValue(null)

    await expect(resolveLocalUserId("user_2missing")).resolves.toBeNull()
  })
})

describe("getUserEnrollments", () => {
  it("queries by the local id, which is what Enrollment.userId references", async () => {
    await expect(getUserEnrollments(LOCAL_ID)).resolves.toEqual(["course_a"])

    expect(enrollmentFindMany).toHaveBeenCalledWith({
      where: { userId: LOCAL_ID },
      select: { courseId: true },
    })
  })

  it("returns nothing rather than querying for a falsy id", async () => {
    await expect(getUserEnrollments("")).resolves.toEqual([])
    expect(enrollmentFindMany).not.toHaveBeenCalled()
  })
})

describe("getUserOrders", () => {
  it("returns the caller's own orders, newest first", async () => {
    orderFindMany.mockResolvedValue([
      {
        id: "order_1",
        amount: 49900,
        currency: "INR",
        status: "PAID",
        courseIds: ["course_a"],
        createdAt: new Date("2026-01-02T03:04:05.000Z"),
      },
    ])

    const orders = await getUserOrders(LOCAL_ID)

    expect(orderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: LOCAL_ID },
        orderBy: { createdAt: "desc" },
      }),
    )
    expect(orders).toEqual([
      {
        id: "order_1",
        amount: 49900,
        currency: "INR",
        status: "PAID",
        courseIds: ["course_a"],
        // Serialised here so the route never hands a Date to JSON, which would
        // become an ISO string only some clients know to parse back.
        createdAt: "2026-01-02T03:04:05.000Z",
      },
    ])
  })

  it("never matches on email, which would expose another person's orders", async () => {
    await getUserOrders(LOCAL_ID)

    const where = (orderFindMany.mock.calls[0] as unknown as [{ where: Record<string, unknown> }])[0].where
    expect(Object.keys(where)).toEqual(["userId"])
    expect(where).not.toHaveProperty("userEmail")
  })

  it("returns nothing rather than querying for a falsy id", async () => {
    await expect(getUserOrders("")).resolves.toEqual([])
    expect(orderFindMany).not.toHaveBeenCalled()
  })
})
