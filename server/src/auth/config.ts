/**
 * Browser origins that Clerk is allowed to accept session tokens from, and the
 * origins this server accepts CORS and Timing-Allow-Origin requests from.
 *
 * Clerk owns the session, so this is the one place where we tell it which
 * origins are legitimate. The values are origins (scheme + host + optional
 * port), never URLs with a path: a path here would be silently ignored by
 * the browser and would weaken the check.
 */

function normalizeOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => (entry.endsWith("/") ? entry.slice(0, -1) : entry))
}

/** Validate by position only: an entry can be attacker-controlled. */
function parseOrigins(raw: string, label: string): string[] {
  return normalizeOrigins(raw).map((entry, index) => {
    let origin: string
    try {
      origin = new URL(entry).origin
    } catch {
      throw new Error(`${label} ${index + 1} is not a valid origin.`)
    }
    if (origin !== entry) {
      throw new Error(`${label} ${index + 1} must be an origin.`)
    }
    return entry
  })
}

function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin)
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  } catch {
    // parseOrigins has already rejected malformed entries.
    return false
  }
}

export function getAuthorizedParties(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.CLERK_AUTHORIZED_PARTIES ?? env.CORS_ALLOWED_ORIGINS ?? ""
  return parseOrigins(raw, "Authorized party")
}

/** The single source of truth for CORS and Timing-Allow-Origin. */
export function getAllowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.CORS_ALLOWED_ORIGINS ??
    (env.NODE_ENV === "production" ? "" : "http://localhost:5173")
  return parseOrigins(raw, "Browser origin")
}

/** Clerk reads this on the server too; the Vite name is kept for compatibility. */
export function getClerkPublishableKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = (env.CLERK_PUBLISHABLE_KEY ?? env.VITE_CLERK_PUBLISHABLE_KEY ?? "").trim()
  return value || undefined
}

export function isPublishableKeyConfigured(key: string | undefined): boolean {
  return Boolean(key && /^pk_(test|live)_[A-Za-z0-9+/=_-]{4,}$/.test(key))
}

export function assertProductionConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== "production") return

  const origins = getAllowedOrigins(env)
  if (origins.length === 0) {
    throw new Error("Production requires configured browser origins.")
  }
  if (origins.some(isLocalOrigin)) {
    throw new Error("Production browser origins must not include localhost.")
  }

  const parties = getAuthorizedParties(env)
  if (parties.length === 0) {
    throw new Error("Production requires at least one authorized browser origin.")
  }
  if (parties.some(isLocalOrigin)) {
    console.warn("Production authorized origins include localhost; remove it after verification.")
  }

  if (!isPublishableKeyConfigured(getClerkPublishableKey(env))) {
    // Public message names neither the variable nor its value; the operator
    // context is in the message itself, so nothing needs to be logged.
    throw new Error("Production requires a valid publishable key configuration.")
  }
}
