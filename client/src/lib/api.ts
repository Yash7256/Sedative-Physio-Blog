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
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }

  /** True when the request failed because nobody is signed in. */
  get isUnauthorized(): boolean {
    return this.status === 401
  }
}

function isJsonBody(body: BodyInit | null | undefined): boolean {
  return typeof body === "string"
}

/**
 * Fetch from the API with credentials attached.
 *
 * Resolves with the raw `Response` for callers that need the body as a blob or
 * a redirect target; throws `ApiError` for anything non-2xx, using the server's
 * own `error` message when there is one so the UI can show something useful
 * instead of "Request failed".
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has("content-type") && isJsonBody(init.body)) {
    headers.set("content-type", "application/json")
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers,
  })

  if (!res.ok) throw new ApiError(res.status, await readErrorMessage(res))
  return res
}

/** Fetch and parse a JSON response. */
export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
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
