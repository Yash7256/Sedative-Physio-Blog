/**
 * Shared auth types.
 *
 * Note: there is no `req.auth` declaration here, and there deliberately should
 * not be one. `@clerk/express` attaches `req.auth` as a *function* and does not
 * augment Express globally, so the app reads it through `readAuth()` in
 * `src/lib/clerk.ts` rather than leaning on a type that does not exist.
 */

/**
 * Per-request provenance recorded on audit rows. Carried through the request's
 * async scope so services never touch `req` and stay unit-testable.
 */
export interface RequestContext {
  ipAddress: string | null
  userAgent: string | null
}

/** For callers with no inbound request, e.g. a background sync triggered by a payment. */
export const NO_REQUEST_CONTEXT: RequestContext = { ipAddress: null, userAgent: null }
