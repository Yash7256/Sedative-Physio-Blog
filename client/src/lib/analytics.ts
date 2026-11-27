/**
 * Minimal first-party product telemetry for the public resource flow.
 *
 * Only allowlisted event names and bounded numeric/categorical fields leave the
 * browser. No URL, user id, course id, header or cookie is ever included. The
 * request uses `credentials: "omit"` and deliberately avoids sendBeacon, whose
 * spec initializes requests with cookies included.
 */

export const RESOURCE_FLOW_EVENTS = [
  "resources_viewed",
  "courses_catalog_requested",
  "courses_catalog_succeeded",
  "courses_catalog_failed",
  "course_cards_rendered",
  "courses_load_more_clicked",
] as const

export type ResourceFlowEvent = (typeof RESOURCE_FLOW_EVENTS)[number]

export const STATUS_BUCKETS = ["4xx", "5xx", "network", "timeout"] as const
export type StatusBucket = (typeof STATUS_BUCKETS)[number]

export interface ResourceFlowPayload {
  filter?: "courses"
  count?: number
  durationMs?: number
  statusBucket?: StatusBucket
}

type NormalizedEvent = { event: ResourceFlowEvent } & ResourceFlowPayload

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function boundedInt(value: unknown, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined
  return Math.min(Math.max(Math.round(value), 0), max)
}

/** Drop everything the analytics contract does not explicitly allow. */
export function normalizeResourceFlowEvent(input: unknown): NormalizedEvent | null {
  if (!isRecord(input)) return null
  const { event } = input
  if (typeof event !== "string" || !(RESOURCE_FLOW_EVENTS as readonly string[]).includes(event)) return null

  const normalized: NormalizedEvent = { event: event as ResourceFlowEvent }
  if (input.filter === "courses") normalized.filter = "courses"

  const count = boundedInt(input.count, 50)
  if (count !== undefined) normalized.count = count

  const durationMs = boundedInt(input.durationMs, 10_000)
  if (durationMs !== undefined) normalized.durationMs = durationMs

  if (input.statusBucket !== undefined) {
    if (typeof input.statusBucket !== "string" ||
        !(STATUS_BUCKETS as readonly string[]).includes(input.statusBucket)) return null
    normalized.statusBucket = input.statusBucket as StatusBucket
  }

  return normalized
}

/** Coarse failure class only; the raw status or error message never ships. */
export function statusBucketFromError(error: unknown): StatusBucket {
  if (error instanceof Error && error.name === "TimeoutError") return "timeout"
  if (error instanceof DOMException && error.name === "AbortError") return "network"

  const status = isRecord(error) ? error.status : undefined
  if (typeof status === "number" && Number.isFinite(status)) {
    return status >= 500 ? "5xx" : "4xx"
  }
  return "network"
}

/** Best-effort telemetry: analytics must never break the catalog render. */
export function trackResourceFlow(event: ResourceFlowEvent, payload: ResourceFlowPayload = {}): void {
  const normalized = normalizeResourceFlowEvent({ event, ...payload })
  if (!normalized) return

  const body = JSON.stringify(normalized)
  if (typeof fetch !== "function") return
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    credentials: "omit",
    keepalive: true,
  }).catch(() => undefined)
}
