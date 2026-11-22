import { AsyncLocalStorage } from "node:async_hooks"
import type { Request } from "express"

import { NO_REQUEST_CONTEXT, type RequestContext } from "./types.js"

/** Cap for the user-agent string stored on audit rows. */
const USER_AGENT_MAX_LENGTH = 200

const requestStorage = new AsyncLocalStorage<RequestContext>()

/**
 * Lifts the provenance a service needs off the request. The single place where
 * `req` is read for that purpose, so services stay free of Express types.
 */
export function requestContext(req: Request): RequestContext {
  const userAgent = req.get("user-agent")?.trim()
  return {
    ipAddress: req.ip ?? null,
    userAgent: userAgent ? userAgent.slice(0, USER_AGENT_MAX_LENGTH) : null,
  }
}

/**
 * Carries the provenance through the request's async call chain. This keeps the
 * service signatures unchanged (and unit-testable) while still making the audit
 * write see the IP and user agent of the request that caused it.
 */
export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return requestStorage.run(context, fn)
}

export function currentRequestContext(): RequestContext {
  return requestStorage.getStore() ?? NO_REQUEST_CONTEXT
}
