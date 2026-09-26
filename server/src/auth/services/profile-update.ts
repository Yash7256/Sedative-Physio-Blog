import { createClerkClient } from "@clerk/backend"

import { BadRequestError, GatewayError, NotFoundError } from "../../lib/errors.js"
import { prisma } from "../../lib/prisma.js"
import { COLLEGE_NAME_MAX_LENGTH, FULL_NAME_MAX_LENGTH } from "../constants.js"
import { getAuthProfile, type AuthProfile } from "./me.js"

export interface ProfileUpdate {
  fullName?: string
  collegeName?: string
}

/**
 * Applies an edit to the caller's own profile.
 *
 * Deliberately narrow. Clerk owns email, phone, password and every credential
 * field, so this endpoint refuses anything else rather than accepting writes it
 * cannot keep: a field edited here but not in Clerk gets reverted the next time
 * a `user.updated` webhook arrives.
 *
 * The name is written to Clerk *first*. `fullName` is mirrored from Clerk by the
 * webhook, so updating only the local row would look successful and then quietly
 * undo itself on the next Clerk-side event. Writing Clerk first and the local row
 * second means the worst case is the opposite — a name changed in Clerk that our
 * row has not caught up with — which the webhook repairs.
 */
export async function updateAuthProfile(
  clerkUserId: string,
  update: ProfileUpdate,
): Promise<AuthProfile> {
  if (update.fullName === undefined && update.collegeName === undefined) {
    throw new BadRequestError("Provide at least one of: fullName, collegeName")
  }

  const existing = await prisma.user.findFirst({
    where: { clerkUserId, deletedAt: null },
    select: { id: true },
  })
  if (!existing) {
    throw new NotFoundError("Account not found.")
  }

  const fullName = normalise(update.fullName)
  const collegeName = normalise(update.collegeName)

  // Both fields are validated before anything is written, so a rejected college
  // name cannot leave the caller's name already changed in Clerk.
  if (update.fullName !== undefined) {
    if ((fullName ?? "").length > FULL_NAME_MAX_LENGTH) {
      throw new BadRequestError(`Name must be ${FULL_NAME_MAX_LENGTH} characters or fewer`)
    }
  }
  if (update.collegeName !== undefined) {
    if ((collegeName ?? "").length > COLLEGE_NAME_MAX_LENGTH) {
      throw new BadRequestError(`College name must be ${COLLEGE_NAME_MAX_LENGTH} characters or fewer`)
    }
  }

  // `!== undefined` rather than truthy: clearing a name must also reach Clerk,
  // or the local row goes blank only until the next `user.updated` webhook
  // mirrors the old name straight back.
  if (fullName !== undefined) {
    await writeNameToClerk(clerkUserId, fullName)
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: {
      // `undefined` leaves the column alone; `null` clears it.
      ...(fullName !== undefined ? { fullName } : {}),
      ...(collegeName !== undefined ? { collegeName } : {}),
    },
  })

  const profile = await getAuthProfile(clerkUserId)
  if (!profile) {
    // The row was tombstoned between the read and the write.
    throw new NotFoundError("Account not found.")
  }
  return profile
}

/**
 * Trims a submitted value and treats an empty string as "clear this field".
 *
 * `undefined` means the caller did not send the field at all, which is distinct
 * from `null` (send it empty) — leave the column alone versus blank it.
 */
function normalise(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Clerk stores a name as two fields and derives `fullName` from them, so a single
 * string has to be split. The last word becomes the surname, which is wrong for
 * mononyms and for names that put the family name first — but it is a display
 * string either way, and the app never parses it back apart.
 *
 * `null` clears both fields, which is what an emptied input means.
 */
function writeNameToClerk(clerkUserId: string, fullName: string | null): Promise<unknown> {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY ?? "" })

  let firstName: string | null
  let lastName: string | null

  if (fullName === null) {
    firstName = null
    lastName = null
  } else {
    const parts = fullName.split(/\s+/)
    lastName = parts.length > 1 ? parts.pop()! : null
    firstName = parts.length > 0 ? parts.join(" ") : null
  }

  // `null` clears a field in Clerk's API even though `UpdateUserParams` types
  // both as `string | undefined`, where `undefined` means "leave unchanged" — the
  // two are not interchangeable, and only `null` can drop a surname when a name
  // shortens or blank a name outright.
  //
  // Verified against the API rather than assumed: `updateUser(id, { firstName:
  // null, lastName: null })` comes back with both fields null on a subsequent
  // read, and omitting the keys leaves the name alone. The type is narrower than
  // the behaviour, so the cast is confined to this one call.
  const nameFields = { firstName, lastName } as unknown as {
    firstName?: string
    lastName?: string
  }

  return clerk.users
    .updateUser(clerkUserId, nameFields)
    .catch((err: unknown) => {
      // Surfaced rather than swallowed: reporting success here would leave the
      // two systems disagreeing with no indication of which one is stale.
      console.error("Failed to update name in Clerk:", err)
      throw new GatewayError("Could not save your name. Please try again.")
    })
}
