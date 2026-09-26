/**
 * Shared auth types.
 *
 * Note: there is no `req.auth` declaration here, and there deliberately should
 * not be one. `@clerk/express` attaches `req.auth` as a *function* and does not
 * augment Express globally, so the app reads it through `readAuth()` in
 * `src/lib/clerk.ts` rather than leaning on a type that does not exist.
 */

/**
 * Per-request provenance recorded on audit rows. Passed explicitly into
 * services so they never touch `req` and stay unit-testable.
 */
export interface RequestContext {
  ipAddress: string | null
  userAgent: string | null
}
