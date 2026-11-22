const API_BASE = import.meta.env.VITE_API_URL ?? ""

/**
 * The single place the browser talks to the API.
 *
 * Every call goes through here for one reason that is easy to get wrong:
 * `credentials: "include"`. Clerk's session lives in an HttpOnly cookie, so the
 * browser is the only thing that can attach it and it will not do so unless
 * asked. In development `VITE_API_URL` is empty and requests are same-origin
 * through the Vite proxy, where the default `same-origin` credential mode
 * happens to work — so a missing `include` is invisible locally and only
 * breaks once the API is on its own origin, as 401s on every authenticated
 * route. Setting it explicitly keeps dev and production behaving identically.
 */

/** Request options accepted by every API helper. */
export type ApiFetchInit = RequestInit & {
  /** Abort the underlying fetch after this many milliseconds. */
  timeoutMs?: number
}

export class ApiError extends Error {
  readonly status: number
  readonly retryAfterMs?: number

  constructor(status: number, message: string, retryAfterMs?: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.retryAfterMs = retryAfterMs
  }

  /** True when the request failed because nobody is signed in. */
  get isUnauthorized(): boolean {
    return this.status === 401
  }
}

/** A client-side timeout. Distinct from an AbortError, which is caller cancellation. */
export class TimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message)
    this.name = "TimeoutError"
  }
}

/**
 * Parse a Retry-After header into milliseconds.
 *
 * Numeric values are seconds, per the HTTP spec. HTTP-date values are
 * converted relative to `nowMs`, which is injectable for deterministic tests.
 */
export function parseRetryAfterMs(header: string | null, nowMs = Date.now()): number | undefined {
  if (!header) return undefined

  const seconds = Number(header.trim())
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000

  const dateMs = Date.parse(header)
  if (Number.isNaN(dateMs)) return undefined
  return Math.max(0, dateMs - nowMs)
}

/** Only transient failures are worth retrying; cancellation is deliberate. */
export function isRetryableApiError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true
  if (error instanceof TypeError) return true
  if (error instanceof DOMException && error.name === "AbortError") return false
  if (error instanceof ApiError) {
    return [408, 429, 500, 502, 503, 504].includes(error.status)
  }
  return false
}

function isJsonBody(body: BodyInit | null | undefined): boolean {
  return typeof body === "string"
}

function timeoutError(timeoutMs: number): TimeoutError {
  return new TimeoutError(`Request timed out after ${timeoutMs}ms`)
}

/**
 * Fetch from the API with credentials attached.
 *
 * Resolves with the raw `Response` for callers that need the body as a blob or
 * a redirect target; throws `ApiError` for anything non-2xx, using the server's
 * own `error` message when there is one so the UI can show something useful
 * instead of "Request failed".
 */
export async function apiFetch(path: string, init: ApiFetchInit = {}): Promise<Response> {
  const { timeoutMs, ...fetchInit } = init
  const headers = new Headers(fetchInit.headers)
  if (fetchInit.body && !headers.has("content-type") && isJsonBody(fetchInit.body)) {
    headers.set("content-type", "application/json")
  }

  const hasTimeout = typeof timeoutMs === "number" && timeoutMs > 0
  const timeoutController = hasTimeout ? new AbortController() : undefined
  const callerSignal = fetchInit.signal ?? undefined
  let timedOut = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const abortTimeoutOnCaller = () => timeoutController?.abort()
  if (timeoutController) {
    if (callerSignal?.aborted) timeoutController.abort()
    else callerSignal?.addEventListener("abort", abortTimeoutOnCaller, { once: true })
    timer = setTimeout(() => {
      timedOut = true
      timeoutController.abort()
    }, timeoutMs)
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...fetchInit,
      signal: timeoutController?.signal ?? callerSignal,
      credentials: "include",
      headers,
    })

    if (timedOut) throw timeoutError(timeoutMs!)
    if (!res.ok) {
      const message = await readErrorMessage(res)
      const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"))
      throw new ApiError(res.status, message, retryAfterMs)
    }
    return res
  } catch (err) {
    if (timedOut) throw timeoutError(timeoutMs!)
    throw err
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    callerSignal?.removeEventListener("abort", abortTimeoutOnCaller)
  }
}

/** Fetch and parse a JSON response. */
export async function apiJson<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const res = await apiFetch(path, init)
  return (await res.json()) as T
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown }
    if (typeof body?.error === "string" && body.error.length > 0) return body.error
  } catch {
    // Not JSON, or the body was already consumed. Fall through to the status.
  }
  return `Request failed with status ${res.status}`
}
