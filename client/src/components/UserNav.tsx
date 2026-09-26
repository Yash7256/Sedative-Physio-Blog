import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react"

import { useAuthProfile, type AuthProfile } from "@/lib/auth"

/**
 * Session controls for the navbar.
 *
 * Clerk's own components drive the session UI — `UserButton` handles the avatar,
 * the account menu and sign-out — while everything the app needs beyond
 * "is there a session" comes from `useAuthProfile`, which reads this app's own
 * profile row over `/api/auth/me`.
 *
 * Both sign-in and sign-up open as modals rather than routes. The app has no
 * `/sign-in` or `/sign-up` page, and adding two just to host Clerk's components
 * would mean two more places for a redirect to go wrong.
 */
export function UserNav() {
  const { profile, isProfilePending, error } = useAuthProfile()

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" className="site-nav-link text-sm transition-opacity hover:opacity-55">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="hidden rounded-full bg-[#1683f6] px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:inline-flex"
          >
            Sign up
          </button>
        </SignUpButton>
      </SignedOut>

      <SignedIn>
        <ProfileLabel profile={profile} isPending={isProfilePending} error={error} />
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  )
}

/**
 * Shows who is signed in, from this app's profile rather than Clerk's user
 * object — so the label only appears once the whole chain has worked: Clerk
 * session, HttpOnly cookie, `/api/auth/me`, and the database row the webhook
 * created. That round trip is the thing worth surfacing, because a name
 * rendered here is proof the backend accepted the session.
 *
 * Hidden on small screens, where the navbar has no room for it.
 */
function ProfileLabel({
  profile,
  isPending,
  error,
}: {
  profile: AuthProfile | null
  isPending: boolean
  error: string | null
}) {
  const label = profile?.fullName?.trim() || profile?.email || null

  return (
    <span
      className="hidden max-w-[16ch] truncate text-sm lg:block"
      // Announced politely because it resolves on its own: a brand-new signup
      // renders "Setting up…" until the Clerk webhook creates the profile row.
      aria-live="polite"
    >
      {error ? (
        <span className="text-xs text-red-500">Profile unavailable</span>
      ) : label ? (
        label
      ) : isPending ? (
        <span className="text-xs opacity-55">Setting up…</span>
      ) : null}
    </span>
  )
}
