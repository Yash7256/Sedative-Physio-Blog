import type { Response } from "express"

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

export class GatewayError extends Error {
  statusCode = 502
  constructor(message = "Payment gateway error") {
    super(message)
    this.name = "GatewayError"
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

export function handleError(err: unknown, res: Response): void {
  if (isHttpError(err)) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }
  console.error("Unhandled error:", err)
  res.status(500).json({ error: "Internal server error" })
}
