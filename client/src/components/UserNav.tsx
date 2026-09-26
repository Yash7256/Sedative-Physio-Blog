import { SignedIn, SignedOut, SignInButton, useUser, useClerk } from "@clerk/clerk-react"
import { Link, useNavigate } from "react-router-dom"
import { LogOut, UserRound } from "lucide-react"

import { useAuthProfile, type AuthProfile } from "@/lib/auth"

/**
 * Session controls for the navbar.
 *
 * When signed out: shows a "Sign in" text button that opens Clerk's modal.
 * When signed in: shows the user's avatar (links to /account) + a sign-out button.
 */
export function UserNav() {
  const { profile, isProfilePending, error } = useAuthProfile()
  const { user } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" className="site-nav-link text-sm transition-opacity hover:opacity-55">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        {/* Name label — hidden on small screens */}
        <ProfileLabel profile={profile} isPending={isProfilePending} error={error} />

        {/* Avatar — clicking navigates to the profile page */}
        <Link
          to="/account"
          aria-label="View your profile"
          className="shrink-0 overflow-hidden rounded-full ring-2 ring-transparent transition-all hover:ring-[#1683f6] focus-visible:ring-[#1683f6]"
        >
          <div className="size-8 sm:size-9 overflow-hidden rounded-full bg-[#13266b]">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName ?? "Your avatar"}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-white">
                <UserRound size={16} />
              </div>
            )}
          </div>
        </Link>

        {/* Sign-out button */}
        <button
          type="button"
          aria-label="Sign out"
          title="Sign out"
          onClick={() => {
            // Navigate away either way. Signing out failing must not strand
            // somebody on a page that is about to start 401ing, and swallowing
            // the rejection keeps it out of the console as an unhandled error.
            signOut()
              .catch(() => {})
              .finally(() => navigate("/"))
          }}
          className="site-nav-link hidden transition-opacity hover:opacity-55 sm:block"
        >
          <LogOut size={16} />
        </button>
      </SignedIn>
    </div>
  )
}

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
