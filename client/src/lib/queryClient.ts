import { QueryClient } from "@tanstack/react-query"

import { ApiError, isRetryableApiError } from "./api"

export const DEFAULT_STALE_TIME_MS = 60_000
export const DEFAULT_GC_TIME_MS = 300_000
export const DEFAULT_QUERY_TIMEOUT_MS = 10_000

/** Retries after the first attempt, so three attempts in total. */
export const MAX_QUERY_RETRIES = 2

const RETRY_BASE_DELAY_MS = 500
const RETRY_MAX_DELAY_MS = 5_000
const RETRY_JITTER_MAX_MS = 250

/** Bounded exponential backoff with jitter, unless the server asked for a longer wait. */
export function queryRetryDelay(attemptIndex: number, error: unknown): number {
  const exponential = RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attemptIndex)
  const retryAfterMs = error instanceof ApiError ? error.retryAfterMs : undefined
  const requested = retryAfterMs === undefined ? exponential : Math.max(exponential, retryAfterMs)
  const bounded = Math.min(requested, RETRY_MAX_DELAY_MS)
  const jitter = Math.floor(Math.random() * RETRY_JITTER_MAX_MS)
  return Math.min(bounded + jitter, RETRY_MAX_DELAY_MS)
}

/** Retry transient failures only, and only up to the configured cap. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_QUERY_RETRIES && isRetryableApiError(error)
}

/**
 * One QueryClient for the whole app: its cache is what gives route navigation
 * request dedupe, background revalidation and stale-data fallback.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        gcTime: DEFAULT_GC_TIME_MS,
        // In v5 this refetches stale queries on focus; "always" would refetch
        // fresh ones too and defeat the 60-second cache window.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: shouldRetryQuery,
        retryDelay: queryRetryDelay,
      },
    },
  })
}
