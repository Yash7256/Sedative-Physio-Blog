import { beforeEach, describe, expect, it, vi } from "vitest"

const userFindFirst = vi.fn()
const userUpdate = vi.fn()
const clerkUpdateUser = vi.fn()

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => userFindFirst(...args),
      update: (...args: unknown[]) => userUpdate(...args),
    },
  },
}))

// Mocked at the shared accessor rather than at the SDK, which is where the app
// now builds its client.
vi.mock("../../lib/clerk.js", () => ({
  getClerkClient: () => ({ users: { updateUser: (...args: unknown[]) => clerkUpdateUser(...args) } }),
}))

const { updateAuthProfile } = await import("../services/profile-update.js")

// `getAuthProfile` re-reads the row after the write; the update is asserted on
// the `data` payload rather than on this return value, so stubbing the re-read
// keeps the two concerns separate.
vi.mock("../services/me.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/me.js")>()
  return { ...actual, getAuthProfile: vi.fn() }
})

const { getAuthProfile } = await import("../services/me.js")
// `vi.mock` swaps the implementation but not the type, so re-type it as a mock.
const mockedGetAuthProfile = getAuthProfile as unknown as ReturnType<typeof vi.fn>

const CLERK_ID = "user_2profileUpdate"
const LOCAL_ID = "cmuiojrf80000xbi102lain8k"

const PROFILE = {
  clerkUserId: CLERK_ID,
  userId: LOCAL_ID,
  role: "user",
  email: "student@example.com",
  fullName: "Ada Lovelace",
  collegeName: "King's College",
  emailVerified: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  userFindFirst.mockResolvedValue({ id: LOCAL_ID })
  userUpdate.mockResolvedValue({})
  clerkUpdateUser.mockResolvedValue({})
  mockedGetAuthProfile.mockResolvedValue(PROFILE)
})

/** The `data` payload of the `user.update` call. */
function updateData(): Record<string, unknown> {
  return (userUpdate.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data
}

describe("updateAuthProfile", () => {
  it("writes the name to Clerk and to the local row", async () => {
    const result = await updateAuthProfile(CLERK_ID, {
      fullName: "Ada Lovelace",
      collegeName: "King's College",
    })

    expect(result).toEqual(PROFILE)
    expect(clerkUpdateUser).toHaveBeenCalledWith(CLERK_ID, {
      firstName: "Ada",
      lastName: "Lovelace",
    })
    expect(updateData()).toEqual({ fullName: "Ada Lovelace", collegeName: "King's College" })
  })

  it("writes the name to Clerk first, or the webhook reverts the local edit", async () => {
    const order: string[] = []
    clerkUpdateUser.mockImplementation(async () => {
      order.push("clerk")
      return {}
    })
    userUpdate.mockImplementation(async () => {
      order.push("local")
      return {}
    })

    await updateAuthProfile(CLERK_ID, { fullName: "Ada Lovelace" })

    // `fullName` is mirrored from Clerk by the `user.updated` webhook, so a local
    // write that lands first is silently undone by the next Clerk-side event.
    expect(order).toEqual(["clerk", "local"])
  })

  it("splits a single-word name into firstName and clears the surname", async () => {
    await updateAuthProfile(CLERK_ID, { fullName: "Cher" })

    expect(clerkUpdateUser).toHaveBeenCalledWith(CLERK_ID, { firstName: "Cher", lastName: null })
  })

  it("does not touch Clerk when only the college changes", async () => {
    await updateAuthProfile(CLERK_ID, { collegeName: "King's College" })

    expect(clerkUpdateUser).not.toHaveBeenCalled()
    expect(updateData()).toEqual({ collegeName: "King's College" })
  })

  it("leaves omitted fields untouched rather than clearing them", async () => {
    await updateAuthProfile(CLERK_ID, { collegeName: "King's College" })

    expect(updateData()).not.toHaveProperty("fullName")
  })

  it("clears a field when it is sent as an empty string", async () => {
    await updateAuthProfile(CLERK_ID, { collegeName: "   " })

    expect(updateData()).toEqual({ collegeName: null })
  })

  it("clears the name in Clerk too, not just locally", async () => {
    await updateAuthProfile(CLERK_ID, { fullName: "   " })

    // The local row alone would be undone by the next `user.updated` webhook,
    // which mirrors Clerk's name back over it.
    expect(clerkUpdateUser).toHaveBeenCalledWith(CLERK_ID, { firstName: null, lastName: null })
    expect(updateData()).toEqual({ fullName: null })
  })

  it("drops a surname when the name gets shorter, without blanking the first name", async () => {
    await updateAuthProfile(CLERK_ID, { fullName: "Ada" })

    expect(clerkUpdateUser).toHaveBeenCalledWith(CLERK_ID, { firstName: "Ada", lastName: null })
  })

  it("trims surrounding whitespace", async () => {
    await updateAuthProfile(CLERK_ID, { fullName: "  Ada Lovelace  " })

    expect(updateData()).toEqual({ fullName: "Ada Lovelace" })
  })

  it("rejects an over-long name without writing anything", async () => {
    await expect(updateAuthProfile(CLERK_ID, { fullName: "x".repeat(121) })).rejects.toThrow(
      /120 characters or fewer/,
    )
    expect(userUpdate).not.toHaveBeenCalled()
    expect(clerkUpdateUser).not.toHaveBeenCalled()
  })

  it("rejects an over-long college name", async () => {
    await expect(updateAuthProfile(CLERK_ID, { collegeName: "x".repeat(161) })).rejects.toThrow(
      /160 characters or fewer/,
    )
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it("validates every field before writing any of them", async () => {
    await expect(
      updateAuthProfile(CLERK_ID, { fullName: "Ada Lovelace", collegeName: "x".repeat(161) }),
    ).rejects.toThrow(/160 characters or fewer/)

    // A rejected college must not leave the name already changed in Clerk.
    expect(clerkUpdateUser).not.toHaveBeenCalled()
  })

  it("refuses a request that changes nothing", async () => {
    await expect(updateAuthProfile(CLERK_ID, {})).rejects.toThrow(/at least one of/i)
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it("rejects an unknown account rather than creating one", async () => {
    userFindFirst.mockResolvedValue(null)

    await expect(updateAuthProfile(CLERK_ID, { fullName: "Ada" })).rejects.toThrow(/Account not found/)
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it("surfaces a Clerk write failure instead of reporting a false success", async () => {
    clerkUpdateUser.mockRejectedValue(new Error("clerk is down"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(updateAuthProfile(CLERK_ID, { fullName: "Ada Lovelace" })).rejects.toThrow(
      /Could not save your name/,
    )
    // The local row must not claim a name Clerk does not have.
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it("rejects a tombstoned account", async () => {
    await updateAuthProfile(CLERK_ID, { collegeName: "King's College" })

    expect(userFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clerkUserId: CLERK_ID, deletedAt: null } }),
    )
  })
})
