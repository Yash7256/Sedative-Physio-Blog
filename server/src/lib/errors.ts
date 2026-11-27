import type { NextFunction, Request, Response } from "express"

export class BadRequestError extends Error {
  statusCode = 400
  constructor(message: string) {
    super(message)
    this.name = "BadRequestError"
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401
  constructor(message = "Unauthorized") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends Error {
  statusCode = 403
  constructor(message = "Forbidden") {
    super(message)
    this.name = "ForbiddenError"
  }
}

export class NotFoundError extends Error {
  statusCode = 404
  constructor(message: string) {
    super(message)
    this.name = "NotFoundError"
  }
}

export class ConflictError extends Error {
  statusCode = 409
  constructor(message: string) {
    super(message)
    this.name = "ConflictError"
  }
}

export class UnprocessableEntityError extends Error {
  statusCode = 422
  constructor(message: string) {
    super(message)
    this.name = "UnprocessableEntityError"
  }
}

export class TooManyRequestsError extends Error {
  statusCode = 429
  constructor(message: string) {
    super(message)
    this.name = "TooManyRequestsError"
  }
}

export class PayloadTooLargeError extends Error {
  statusCode = 413
  constructor(message = "Payload is too large") {
    super(message)
    this.name = "PayloadTooLargeError"
  }
}

export class GatewayError extends Error {
  statusCode = 502
  constructor(message = "Payment gateway error") {
    super(message)
    this.name = "GatewayError"
  }
}

export class ServiceUnavailableError extends Error {
  statusCode = 503
  constructor(message = "Service temporarily unavailable") {
    super(message)
    this.name = "ServiceUnavailableError"
  }
}

/**
 * An error carrying an explicit HTTP status. Every class above sets one, and
 * module-local subclasses (e.g. `auth/errors.ts`) inherit it, so `handleError`
 * can key off the status instead of enumerating classes — adding a status
 * anywhere in the app needs no change here.
 *
 * Exposing `err.message` is safe because every HttpError in this codebase is
 * hand-written with a client-safe string; anything else falls through to the
 * generic 500 below.
 */
export interface HttpError extends Error {
  statusCode: number
}

function isHttpError(err: unknown): err is HttpError {
  if (!(err instanceof Error)) return false
  const { statusCode } = err as Partial<HttpError>
  return typeof statusCode === "number" && Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
}

const SAFE_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])

/** Keep only token-shaped characters so a header or route cannot inject log fields. */
function safeToken(value: unknown, fallback: string): string {
  return typeof value === "string" && /^[A-Za-z0-9._:/[\]-]{1,128}$/.test(value) ? value : fallback
}

/**
 * Log only operator-controlled or platform-controlled fields: req.path and
 * arbitrary headers can contain user data, while req.route.path is the
 * developer-defined pattern (e.g. `/api/notes/:id/file`).
 */
function logContext(req?: Request): { method: string; route: string; requestId: string } {
  if (!req) return { method: "-", route: "-", requestId: "-" }
  const routePath = req.route && typeof req.route.path === "string" ? req.route.path : ""
  const pattern = `${typeof req.baseUrl === "string" ? req.baseUrl : ""}${routePath}`.replace(/\/{2,}/g, "/")
  const requestId = req.headers["x-vercel-request-id"] ?? req.headers["x-request-id"]
  return {
    method: SAFE_METHODS.has(req.method) ? req.method : "-",
    route: safeToken(pattern, "-"),
    requestId: safeToken(Array.isArray(requestId) ? requestId[0] : requestId, "-"),
  }
}

function logUnexpectedError(err: unknown, req?: Request): void {
  const context = logContext(req)
  // A third-party error message may contain PII or upstream response bodies;
  // only its class name is safe to record.
  const name = safeToken(err instanceof Error ? err.name : "UnknownError", "UnknownError")
  console.error(JSON.stringify({
    event: "unhandled_error",
    method: context.method,
    route: context.route,
    requestId: context.requestId,
    error: name,
  }))
}

export function handleError(err: unknown, res: Response, req?: Request): void {
  if (isHttpError(err)) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  logUnexpectedError(err, req)
  res.status(500).json({ error: "Internal server error" })
}

function isMalformedJson(err: unknown): boolean {
  if (!(err instanceof SyntaxError)) return false
  const parsed = err as SyntaxError & { status?: unknown; type?: unknown }
  return parsed.status === 400 || parsed.type === "entity.parse.failed"
}

/**
 * Express's terminal error middleware. Every response is JSON; stacks and
 * arbitrary error messages never leave the process.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return

  if (isMalformedJson(err)) {
    res.status(400).json({ error: "Malformed JSON body." })
    return
  }
  if (isHttpError(err)) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  logUnexpectedError(err, req)
  res.status(500).json({ error: "Internal server error" })
}
