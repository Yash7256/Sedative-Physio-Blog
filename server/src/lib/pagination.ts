import { BadRequestError } from "./errors.js"

export const DEFAULT_PAGE_SIZE = 12
export const MAX_PAGE_SIZE = 50

export interface Cursor {
  id: string
  /** `null` identifies a legacy id-only cursor that still needs a row lookup. */
  createdAt: Date | null
}

export interface PageRequest {
  limit: number
  cursorId: string | null
  cursorCreatedAt?: Date | null
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

interface CursorPayload {
  id: string
  createdAt?: string
}

interface CursorRow {
  id: string
  createdAt: Date
}

/**
 * Opaque cursor: base64url(JSON.stringify({ id, createdAt })). Carrying the
 * sort timestamp makes a page independent of its anchor row still existing.
 * The older `{ id }` shape remains readable while those cursors are in flight.
 */
export function encodeCursor(row: CursorRow | string): string {
  const payload: CursorPayload = typeof row === "string"
    ? { id: row }
    : { id: row.id, createdAt: row.createdAt.toISOString() }
  return Buffer.from(JSON.stringify(payload satisfies CursorPayload), "utf8").toString("base64url")
}

export function decodeCursor(value: unknown): Cursor {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) {
    throw new BadRequestError("Invalid cursor")
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("bad payload")
    const { id, createdAt } = parsed as Partial<CursorPayload>
    if (typeof id !== "string" || id.length === 0 || id.length > 64) throw new Error("bad id")

    if (createdAt === undefined) return { id, createdAt: null }
    if (typeof createdAt !== "string" || createdAt.length > 40) throw new Error("bad timestamp")
    const timestamp = new Date(createdAt)
    if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString() !== createdAt) {
      throw new Error("bad timestamp")
    }
    return { id, createdAt: timestamp }
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
  if (rawCursor === undefined) return { limit, cursorId: null }

  const cursor = decodeCursor(rawCursor)
  return {
    limit,
    cursorId: cursor.id,
    ...(cursor.createdAt ? { cursorCreatedAt: cursor.createdAt } : {}),
  }
}

/** Keyset for `orderBy [{ createdAt: "desc" }, { id: "desc" }]`. */
export function olderThan(cursor: CursorRow) {
  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  }
}

/**
 * `take: limit + 1` gives a cheap lookahead; the extra row is never returned.
 * Callers that publish `createdAt` (models) pass an identity mapper.
 */
export function pageResult<T extends CursorRow>(rows: T[], limit: number): Page<Omit<T, "createdAt">>
export function pageResult<T extends CursorRow, R>(rows: T[], limit: number, mapItem: (row: T) => R): Page<R>
export function pageResult<T extends CursorRow, R>(
  rows: T[],
  limit: number,
  mapItem?: (row: T) => R,
): Page<R | Omit<T, "createdAt">> {
  const kept = rows.length <= limit ? rows : rows.slice(0, limit)
  const items = mapItem
    ? kept.map(mapItem)
    : kept.map(({ createdAt: _createdAt, ...rest }) => rest as Omit<T, "createdAt">)
  return {
    items,
    nextCursor: rows.length <= limit ? null : encodeCursor(kept[kept.length - 1]!),
  }
}
