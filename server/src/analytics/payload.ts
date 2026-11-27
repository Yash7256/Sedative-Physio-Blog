/** Server-side mirror of the client analytics contract. Unknown fields are ignored; malformed values are refused. */

export const ANALYTICS_EVENTS = [
  "resources_viewed",
  "courses_catalog_requested",
  "courses_catalog_succeeded",
  "courses_catalog_failed",
  "course_cards_rendered",
  "courses_load_more_clicked",
] as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number]

export const STATUS_BUCKETS = ["4xx", "5xx", "network", "timeout"] as const
export type StatusBucket = (typeof STATUS_BUCKETS)[number]

export interface AnalyticsEventPayload {
  filter?: "courses"
  count?: number
  durationMs?: number
  statusBucket?: StatusBucket
}

export interface ParsedAnalyticsEvent {
  event: AnalyticsEvent
  payload: AnalyticsEventPayload
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function boundedInt(value: unknown, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined
  return Math.min(Math.max(Math.round(value), 0), max)
}

export function parseAnalyticsPayload(body: unknown): ParsedAnalyticsEvent | null {
  if (!isRecord(body)) return null
  const { event } = body
  if (typeof event !== "string" || !(ANALYTICS_EVENTS as readonly string[]).includes(event)) return null

  const payload: AnalyticsEventPayload = {}
  if (body.filter === "courses") payload.filter = "courses"

  const count = boundedInt(body.count, 50)
  if (count !== undefined) payload.count = count

  const durationMs = boundedInt(body.durationMs, 10_000)
  if (durationMs !== undefined) payload.durationMs = durationMs

  if (body.statusBucket !== undefined) {
    if (typeof body.statusBucket !== "string" ||
        !(STATUS_BUCKETS as readonly string[]).includes(body.statusBucket)) return null
    payload.statusBucket = body.statusBucket as StatusBucket
  }

  return { event: event as AnalyticsEvent, payload }
}
