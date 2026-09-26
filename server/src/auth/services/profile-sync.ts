import { prisma } from "../../lib/prisma.js"
import { AUDIT_EVENT } from "../constants.js"
import { readFallbackName, readPrimaryEmail, readRole } from "./webhook-verify.js"
import type { ClerkUserData } from "./webhook-verify.js"

/**
 * Keeps the local `User` row in step with Clerk. Clerk owns identity; this owns
 * the domain profile, and Clerk is the upstream source for it.
 *
 * All three entry points are idempotent. Clerk retries webhooks and can deliver
 * them out of order, so "already synced" must be a success, not an error — an
 * endpoint that 500s on a duplicate gets retried forever.
 */

export type SyncOutcome =
  | { action: "created"; userId: string }
  | { action: "relinked"; userId: string }
  | { action: "synced"; userId: string }
  | { action: "noop" }

/**
 * Creates or updates the profile for a Clerk user.
 *
 * Three cases, in order of preference:
 *
 * 1. A row already carries this `clerkUserId` — a webhook retry, or a plain
 *    `user.updated`. Sync it and stop.
 * 2. No such row, but an *unlinked* row (one with a null `clerkUserId`) matches
 *    the primary email. Adopt it. This is the migration path for anyone who
 *    registered before the Clerk cutover: their enrollments and order history
 *    are already attached to that row, and a fresh insert would orphan them.
 * 3. Nothing matches — create the row.
 */
export async function syncProfileFromClerk(user: ClerkUserData): Promise<SyncOutcome> {
  const existing = await prisma.user.findFirst({
    where: { clerkUserId: user.id },
    select: { id: true, fullName: true },
  })

  if (existing) {
    await applyClerkFields(existing.id, user, existing.fullName)
    return { action: "synced", userId: existing.id }
  }

  const { email, emailVerifiedAt } = readPrimaryEmail(user)
  const candidate = email ? await findAdoptableRow(email) : null

  if (candidate) {
    await applyClerkFields(candidate.id, user, candidate.fullName, {
      adoptClerkId: true,
    })
    await recordProfileEvent(candidate.id, AUDIT_EVENT.PROFILE_RELINKED, user.id)
    return { action: "relinked", userId: candidate.id }
  }

  const created = await prisma.user.create({
    data: {
      clerkUserId: user.id,
      email,
      emailVerifiedAt,
      fullName: readFallbackName(user),
      role: readRole(user) ?? "user",
    },
    select: { id: true },
  })

  await recordProfileEvent(created.id, AUDIT_EVENT.PROFILE_CREATED, user.id)
  return { action: "created", userId: created.id }
}

/**
 * Detaches a profile from a deleted Clerk user instead of deleting the row.
 *
 * `"Order".userId` is `ON DELETE RESTRICT`, so a hard delete would fail outright
 * once an order exists; `"Enrollment".userId` is `ON DELETE CASCADE`, so where
 * there are no orders it would succeed and quietly discard enrolments. Neither
 * outcome is acceptable for a record of what someone paid for.
 */
export async function anonymiseProfile(
  clerkUserId: string,
  event?: { id: string },
): Promise<SyncOutcome> {
  const user = await prisma.user.findFirst({
    where: { clerkUserId },
    select: { id: true },
  })

  if (!user) return { action: "noop" }

  await prisma.user.update({
    where: { id: user.id },
    data: { clerkUserId: null, deletedAt: new Date() },
  })

  await recordProfileEvent(user.id, AUDIT_EVENT.PROFILE_ANONYMISED, event?.id ?? null)
  return { action: "synced", userId: user.id }
}

/**
 * Finds an unlinked profile this Clerk user may claim.
 *
 * Two exclusions, both deliberate:
 * - `clerkUserId: null` — a row still linked to another identity must never be
 *   stolen by a sign-in that happens to match its email.
 * - `deletedAt: null` — a tombstoned profile is not revived. Someone who
 *   deletes their account and later signs up again with the same address gets a
 *   clean profile rather than silently inheriting the previous person's
 *   enrollments.
 */
async function findAdoptableRow(
  email: string,
): Promise<{ id: string; fullName: string | null } | null> {
  return prisma.user.findFirst({
    where: { email, clerkUserId: null, deletedAt: null },
    select: { id: true, fullName: true },
  })
}

/**
 * Applies Clerk's view of the user onto an existing row.
 *
 * `fullName` is only ever *filled in*, never overwritten: it is collected in
 * this app's own post-sign-up step, so letting a Clerk rename blank it out
 * would destroy something the user typed deliberately. A null placeholder
 * makes room for a rename to fill later, but never erases an existing value.
 */
async function applyClerkFields(
  id: string,
  user: ClerkUserData,
  currentFullName: string | null,
  options: { adoptClerkId?: boolean } = {},
): Promise<void> {
  const { email, emailVerifiedAt } = readPrimaryEmail(user)
  const role = readRole(user)
  const fallbackName = readFallbackName(user)

  try {
    await prisma.user.update({
      where: { id },
      data: {
        ...(options.adoptClerkId ? { clerkUserId: user.id, deletedAt: null } : {}),
        email,
        emailVerifiedAt,
        ...(currentFullName === null && fallbackName !== null
          ? { fullName: fallbackName }
          : {}),
        ...(role ? { role } : {}),
      },
    })
  } catch (err) {
    // A concurrent webhook already claimed this clerkUserId. Treat it as done
    // rather than surfacing a 500 that Clerk will retry forever.
    if (isUniqueViolation(err)) return
    throw err
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  )
}

async function recordProfileEvent(
  userId: string,
  event: string,
  clerkUserId: string | null,
): Promise<void> {
  await prisma.authAuditLog.create({
    data: {
      userId,
      event,
      metadata: clerkUserId ? { clerkUserId } : undefined,
    },
  })
}
