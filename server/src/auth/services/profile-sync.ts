import { prisma } from "../../lib/prisma.js"
import { AUDIT_EVENT } from "../constants.js"
import { readFallbackName, readPrimaryEmail } from "./webhook-verify.js"
import type { ClerkUserData } from "./webhook-verify.js"

/**
 * Keeps the local `User` row in step with Clerk. Clerk owns identity; this owns
 * the domain profile, and Clerk is the upstream source for it.
 *
 * All entry points are idempotent. Clerk retries webhooks and can deliver them
 * out of order, so "already synced" must be a success, not an error — an
 * endpoint that 500s on a duplicate gets retried forever.
 */

export type SyncOutcome =
  | { action: "created"; userId: string }
  | { action: "relinked"; userId: string }
  | { action: "synced"; userId: string }
  | { action: "noop" }

type ExistingProfile = {
  id: string
  fullName: string | null
  emailVerifiedAt: Date | null
}

type SyncOptions = {
  allowCreate?: boolean
}

/**
 * Creates or updates the profile for a Clerk user.
 *
 * - Linked row: sync from Clerk.
 * - Unlinked/absent row: webhooks never create from payload (`allowCreate: false`);
 *   only a fresh Clerk API read may create (`allowCreate: true`).
 * - Adoption: only a Clerk-verified email may relink an unlinked, non-tombstoned row.
 * - Email stored locally is verified-only to prevent unverified squatting.
 */
export async function syncProfileFromClerk(
  user: ClerkUserData,
  options: SyncOptions = {},
): Promise<SyncOutcome> {
  const existing = await prisma.user.findFirst({
    where: { clerkUserId: user.id },
    select: { id: true, fullName: true, emailVerifiedAt: true },
  })

  if (existing) {
    return applyClerkFields(existing, user)
  }

  if (!options.allowCreate) {
    return { action: "noop" }
  }

  const { email, verified } = readPrimaryEmail(user)
  const safeEmail = verified ? email : null
  const candidate = safeEmail ? await findAdoptableRow(safeEmail) : null

  if (candidate) {
    try {
      await prisma.user.update({
        where: { id: candidate.id },
        data: {
          clerkUserId: user.id,
          deletedAt: null,
          email: safeEmail,
          emailVerifiedAt: candidate.emailVerifiedAt ?? new Date(),
          ...(candidate.fullName === null && readFallbackName(user) !== null
            ? { fullName: readFallbackName(user) }
            : {}),
        },
      })
    } catch (err) {
      if (conflictsOn(err, "clerkUserId")) {
        const winner = await prisma.user.findFirst({
          where: { clerkUserId: user.id },
          select: { id: true, fullName: true, emailVerifiedAt: true },
        })
        return winner ? applyClerkFields(winner, user) : { action: "noop" }
      }
      if (conflictsOn(err, "email")) {
        return createProfile(user, { forceNullEmail: true })
      }
      throw err
    }

    await recordProfileEvent(candidate.id, AUDIT_EVENT.PROFILE_RELINKED, {
      clerkUserId: user.id,
      verified: true,
    })
    return { action: "relinked", userId: candidate.id }
  }

  return createProfile(user)
}

async function createProfile(
  user: ClerkUserData,
  options: { forceNullEmail?: boolean } = {},
): Promise<SyncOutcome> {
  const { email, verified } = readPrimaryEmail(user)
  const safeEmail = options.forceNullEmail ? null : verified ? email : null
  const emailVerifiedAt = !options.forceNullEmail && verified ? new Date() : null

  try {
    const created = await prisma.user.create({
      data: {
        clerkUserId: user.id,
        email: safeEmail,
        emailVerifiedAt,
        fullName: readFallbackName(user),
      },
      select: { id: true },
    })

    if (options.forceNullEmail) {
      await recordProfileEvent(created.id, AUDIT_EVENT.PROFILE_EMAIL_CONFLICT, {
        clerkUserId: user.id,
      })
    }
    await recordProfileEvent(created.id, AUDIT_EVENT.PROFILE_CREATED, {
      clerkUserId: user.id,
    })
    return { action: "created", userId: created.id }
  } catch (err) {
    if (conflictsOn(err, "clerkUserId")) {
      const winner = await prisma.user.findFirst({
        where: { clerkUserId: user.id },
        select: { id: true, fullName: true, emailVerifiedAt: true },
      })
      return winner ? applyClerkFields(winner, user) : { action: "noop" }
    }
    if (conflictsOn(err, "email") && !options.forceNullEmail) {
      return createProfile(user, { forceNullEmail: true })
    }
    throw err
  }
}

/**
 * Detaches a profile from a deleted Clerk user instead of deleting the row.
 *
 * `"Order".userId` is `ON DELETE RESTRICT`, so a hard delete would fail outright
 * once an order exists; `"Enrollment".userId` is `ON DELETE CASCADE`, so where
 * there are no orders it would succeed and quietly discard enrolments. Neither
 * outcome is acceptable for a record of what someone paid for.
 *
 * PII is cleared and the email freed for reuse in a single transaction.
 */
export async function anonymiseProfile(clerkUserId: string): Promise<SyncOutcome> {
  const user = await prisma.user.findFirst({
    where: { clerkUserId },
    select: { id: true },
  })

  if (!user) return { action: "noop" }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        clerkUserId: null,
        deletedAt: new Date(),
        email: null,
        emailVerifiedAt: null,
        fullName: null,
        collegeName: null,
      },
    }),
    prisma.authAuditLog.create({
      data: {
        userId: user.id,
        event: AUDIT_EVENT.PROFILE_ANONYMISED,
        metadata: { clerkUserId },
      },
    }),
  ])

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
): Promise<{ id: string; fullName: string | null; emailVerifiedAt: Date | null } | null> {
  return prisma.user.findFirst({
    where: { email, clerkUserId: null, deletedAt: null },
    select: { id: true, fullName: true, emailVerifiedAt: true },
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
  existing: ExistingProfile,
  user: ClerkUserData,
): Promise<SyncOutcome> {
  const { email, verified } = readPrimaryEmail(user)
  const fallbackName = readFallbackName(user)

  const data = {
    email: verified ? email : null,
    emailVerifiedAt: verified ? (existing.emailVerifiedAt ?? new Date()) : null,
    ...(existing.fullName === null && fallbackName !== null ? { fullName: fallbackName } : {}),
  }

  try {
    await prisma.user.update({ where: { id: existing.id }, data })
  } catch (err) {
    if (conflictsOn(err, "email")) {
      const { email: _email, emailVerifiedAt: _ev, ...rest } = data
      await prisma.user.update({
        where: { id: existing.id },
        data: { ...rest, email: null, emailVerifiedAt: null },
      })
      await recordProfileEvent(existing.id, AUDIT_EVENT.PROFILE_EMAIL_CONFLICT, {
        clerkUserId: user.id,
      })
      return { action: "synced", userId: existing.id }
    }
    if (conflictsOn(err, "clerkUserId")) {
      // Concurrent sync already applied for this identity.
      return { action: "synced", userId: existing.id }
    }
    throw err
  }

  return { action: "synced", userId: existing.id }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "P2002"
}

export function conflictsOn(err: unknown, field: "email" | "clerkUserId"): boolean {
  if (!isUniqueViolation(err)) return false
  const target = (err as { meta?: { target?: unknown } }).meta?.target
  if (Array.isArray(target)) return target.includes(field)
  if (typeof target === "string") {
    if (field === "email") return target.includes("email")
    if (field === "clerkUserId") return target.includes("clerkUserId")
  }
  return false
}

async function recordProfileEvent(
  userId: string,
  event: string,
  metadata?: Record<string, string | number | boolean | null>,
): Promise<void> {
  await prisma.authAuditLog.create({
    data: {
      userId,
      event,
      metadata,
    },
  })
}
