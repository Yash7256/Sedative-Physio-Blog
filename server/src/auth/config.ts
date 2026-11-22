/**
 * Browser origins that Clerk is allowed to accept session tokens from.
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

export function getAuthorizedParties(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.CLERK_AUTHORIZED_PARTIES ?? env.CORS_ALLOWED_ORIGINS ?? ""
  return normalizeOrigins(raw).map((entry, index) => {
    let origin: string
    try {
      origin = new URL(entry).origin
    } catch {
      throw new Error(`Authorized party ${index + 1} is not a valid origin.`)
    }
    // Report only the position, never a value that could be attacker-controlled.
    if (origin !== entry) {
      throw new Error(`Authorized party ${index + 1} must be an origin.`)
    }
    return entry
  })
}

export function assertProductionConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== "production") return

  const parties = getAuthorizedParties(env)
  if (parties.length === 0) {
    throw new Error("Production requires at least one authorized browser origin.")
  }
  if (parties.some((origin) => origin.includes("localhost"))) {
    console.warn("Production authorized origins include localhost; remove it after verification.")
  }
}
