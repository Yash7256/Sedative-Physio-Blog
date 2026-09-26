import type { Request } from "express"

import type { RequestContext } from "./types.js"

/** Cap for the user-agent string stored on audit rows. */
const USER_AGENT_MAX_LENGTH = 200

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
