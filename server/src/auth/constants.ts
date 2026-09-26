/**
 * Tunables for the profile layer that remains after Clerk took over identity.
 *
 * Everything auth-adjacent that is *not* Clerk's responsibility lives here:
 * profile field limits and the audit vocabulary. Token TTLs, password policy,
 * lockout thresholds and rate-limit windows are gone — Clerk owns them, and
 * duplicating those values locally is how two systems start disagreeing about
 * the same rule.
 */

/** Caps for the student profile fields the client collects after Clerk sign-up. */
export const FULL_NAME_MAX_LENGTH = 120
export const COLLEGE_NAME_MAX_LENGTH = 160

// ============ AUDIT EVENTS ============

/**
 * `AuthAuditLog.event` values, so a typo can't silently create a new event.
 *
 * Note what is absent: login_success, password_reset_*, email_verified and the
 * other credential events from the old custom auth. Clerk owns those and does
 * not report them to us, so writing them here would mean logging guesses.
 * What remains are the events this app is actually authoritative for.
 *
 * A plain re-sync of an already-linked user is deliberately not an event:
 * Clerk emits `user.updated` for routine changes like a name or avatar change,
 * and logging each one would bury the create/relink/anonymise rows that
 * actually matter.
 */
export const AUDIT_EVENT = {
  PROFILE_CREATED: "profile_created",
  PROFILE_RELINKED: "profile_relinked",
  PROFILE_ANONYMISED: "profile_anonymised",
} as const

export type AuditEvent = (typeof AUDIT_EVENT)[keyof typeof AUDIT_EVENT]
