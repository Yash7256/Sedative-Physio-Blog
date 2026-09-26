import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useAuth } from "@clerk/clerk-react"

import { ApiError, apiJson } from "./api"

/**
 * The app's own profile, as returned by `GET /api/auth/me`.
 *
 * Deliberately not Clerk's `User` object. Clerk owns identity; this row is what
 * the app actually reads (role, college, verified state) and it only exists once
 * the `user.created` webhook has created it. The two can disagree, and when they
 * do the app's copy is the one that counts.
 */
export interface AuthProfile {
  clerkUserId: string
  userId: string
  role: string
  email: string | null
  fullName: string | null
  collegeName: string | null
  emailVerified: boolean
}

interface AuthContextValue {
  /** Clerk's session state. */
  isSignedIn: boolean
  /** Clerk has finished restoring the session; safe to branch on `isSignedIn`. */
  isLoaded: boolean
  profile: AuthProfile | null
  /**
   * True while the profile is being fetched, and also while it is being waited
   * on. A brand-new signup sits here until the Clerk webhook creates the row,
   * which is a transient state rather than a failure.
   */
  isProfilePending: boolean
  /** Set only when the session is valid but the profile could not be read. */
  error: string | null
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Backoff for the "signed in, profile not there yet" case.
 *
 * Clerk returns from the sign-up flow as soon as the session exists, while the
 * `user.created` webhook is still in flight, so the first `/api/auth/me` can
 * legitimately 401 with "Account not found". Retrying for a few seconds turns
 * that from a dead end — a signed-in user with no profile and no way to get one
 * without a manual reload — into a brief spinner. The window is deliberately
 * short: past a few seconds the webhook is not merely slow, it has failed, and
 * pretending otherwise just delays the error.
 */
const PROFILE_RETRY_DELAYS_MS = [400, 800, 1600, 3200]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // `useAuth()` alone, deliberately. It already carries the Clerk user id, which
  // is the only thing needed to decide when to re-read the profile — this app
  // never reads Clerk's user resource, because the name it displays comes from
  // its own profile row. Pairing it with `useUser()` would mean two
  // independently-updating subscriptions to sign-in state, which can disagree
  // for a render or two around a session change.
  const { isSignedIn, isLoaded, userId } = useAuth()
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [isProfilePending, setIsProfilePending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  const refresh = useCallback(() => setReloadNonce((n) => n + 1), [])

  // Keyed on the Clerk user id rather than `isSignedIn`, so a token refresh or
  // a re-render on the same account does not re-fetch the profile.
  const clerkUserId = userId ?? null

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn || !clerkUserId) {
      setProfile(null)
      setError(null)
      setIsProfilePending(false)
      return
    }

    // Guards every setState below: StrictMode runs effects twice in dev, and an
    // in-flight retry chain must not write into an unmounted tree.
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const attempt = async (delays: number[]) => {
      setIsProfilePending(true)
      try {
        const next = await apiJson<AuthProfile>("/api/auth/me")
        if (cancelled) return
        setProfile(next)
        setError(null)
        setIsProfilePending(false)
      } catch (err) {
        if (cancelled) return

        if (err instanceof ApiError && err.isUnauthorized && delays.length > 0) {
          const [delay, ...rest] = delays
          timer = setTimeout(() => void attempt(rest), delay)
          return
        }

        setProfile(null)
        // An unresolved 401 is the webhook genuinely not having landed, which is
        // a real state but not an error string — the UI shows it as pending
        // rather than as a failure.
        setError(
          err instanceof ApiError && err.isUnauthorized
            ? null
            : err instanceof Error
              ? err.message
              : "Could not load your profile.",
        )
        setIsProfilePending(false)
      }
    }

    void attempt(PROFILE_RETRY_DELAYS_MS)

    return () => {
      cancelled = true
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [isLoaded, isSignedIn, clerkUserId, reloadNonce])

  const value = useMemo<AuthContextValue>(
    () => ({
      isSignedIn: isSignedIn ?? false,
      isLoaded,
      profile,
      isProfilePending,
      error,
      refresh,
    }),
    [isSignedIn, isLoaded, profile, isProfilePending, error, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthProfile(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuthProfile must be used inside <AuthProvider>")
  return ctx
}
