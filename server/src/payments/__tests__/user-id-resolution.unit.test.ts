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

const { resolveLocalUserId } = await import("../../auth/services/me.js")
const { getUserEnrollments, getUserOrders } = await import("../service.js")

const CLERK_ID = "user_2abcLocalLookup"
const LOCAL_ID = "cmuiojrf80000xbi102lain8k"

beforeEach(() => {
  vi.clearAllMocks()
  userFindFirst.mockResolvedValue({ id: LOCAL_ID })
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

  it("returns null when no row matches, so writes can refuse", async () => {
    userFindFirst.mockResolvedValue(null)
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
