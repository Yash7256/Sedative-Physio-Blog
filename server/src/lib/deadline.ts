import { ServiceUnavailableError } from "./errors.js"

export const CATALOG_DB_TIMEOUT_MS = 2_000

/** A bad override must not silently turn a safety timeout into zero or Infinity. */
export function catalogDbTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.CATALOG_DB_TIMEOUT_MS
  if (raw === undefined) return CATALOG_DB_TIMEOUT_MS
  const parsed = Number(raw)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : CATALOG_DB_TIMEOUT_MS
}

/**
 * Public catalog reads must not hold a serverless invocation open while the DB
 * stalls. The timeout only releases the request; the underlying query is left
 * to the Prisma client. The error is generic so a driver message cannot leak.
 */
export async function withDeadline<T>(
  work: Promise<T>,
  timeoutMs = catalogDbTimeoutMs(),
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new ServiceUnavailableError("Catalog data is temporarily unavailable."))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
