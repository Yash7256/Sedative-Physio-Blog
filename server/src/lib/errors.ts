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

export class GatewayError extends Error {
  statusCode = 502
  constructor(message = "Payment gateway error") {
    super(message)
    this.name = "GatewayError"
  }
}

export function handleError(err: unknown, res: Response): void {
  if (err instanceof BadRequestError) {
    res.status(400).json({ error: err.message })
    return
  }
  if (err instanceof UnauthorizedError) {
    res.status(401).json({ error: err.message })
    return
  }
  if (err instanceof ForbiddenError) {
    res.status(403).json({ error: err.message })
    return
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message })
    return
  }
  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message })
    return
  }
  if (err instanceof GatewayError) {
    res.status(502).json({ error: err.message })
    return
  }
  console.error("Unhandled error:", err)
  res.status(500).json({ error: "Internal server error" })
}
