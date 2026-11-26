import { BadRequestError } from "./errors.js"

export const DEFAULT_PAGE_SIZE = 12
export const MAX_PAGE_SIZE = 50

export interface PageRequest {
  limit: number
  cursorId: string | null
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

interface CursorPayload {
  id: string
}

/**
 * Opaque cursor: base64url(JSON.stringify({ id })). Encoding the id keeps the
 * wire format extensible — a future sort can add its sort values to the JSON
 * without changing the query-string contract.
 */
export function encodeCursor(id: string): string {
  return Buffer.from(JSON.stringify({ id } satisfies CursorPayload), "utf8").toString("base64url")
}

export function decodeCursor(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) {
    throw new BadRequestError("Invalid cursor")
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("bad payload")
    const { id } = parsed as Partial<CursorPayload>
    if (typeof id !== "string" || id.length === 0 || id.length > 64) throw new Error("bad id")
    return id
  } catch {
    throw new BadRequestError("Invalid cursor")
  }
}

/** Default 12, cap 50. Non-numeric or non-positive values are refused, not guessed. */
export function parsePageRequest(query: Record<string, unknown>): PageRequest {
  const rawLimit = query["limit"]
  let limit = DEFAULT_PAGE_SIZE
  if (rawLimit !== undefined) {
    if (typeof rawLimit !== "string" || !/^\d+$/.test(rawLimit)) throw new BadRequestError("Invalid limit")
    const parsed = Number(rawLimit)
    if (!Number.isSafeInteger(parsed) || parsed < 1) throw new BadRequestError("Invalid limit")
    limit = Math.min(parsed, MAX_PAGE_SIZE)
  }

  const rawCursor = query["cursor"]
  return { limit, cursorId: rawCursor === undefined ? null : decodeCursor(rawCursor) }
}

/** Keyset for `orderBy [{ createdAt: "desc" }, { id: "desc" }]`. */
export function olderThan(cursor: { createdAt: Date; id: string }) {
  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  }
}

/** `take: limit + 1` gives a cheap lookahead; the extra row is never returned. */
export function pageResult<T extends { id: string }>(rows: T[], limit: number): Page<T> {
  if (rows.length <= limit) return { items: rows, nextCursor: null }
  const items = rows.slice(0, limit)
  return { items, nextCursor: encodeCursor(items[items.length - 1]!.id) }
}
