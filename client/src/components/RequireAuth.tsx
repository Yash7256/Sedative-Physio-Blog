import { SignInButton, useAuth } from "@clerk/clerk-react"
import { ShieldAlert } from "lucide-react"

/**
 * Gate for pages that only make sense with a session.
 *
 * Renders nothing while Clerk restores the session, rather than flashing the
 * signed-out prompt at somebody who is in fact signed in — that flash is what
 * makes an auth gate feel janky on every navigation.
 *
 * Offers the sign-in modal rather than redirecting, so a signed-out visit to a
 * protected URL keeps its address bar and the user lands back where they were
 * once authenticated. Redirecting to a login route loses the target unless it is
 * threaded through, which is a bug factory.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return null

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="grid size-14 place-items-center rounded-full bg-[#e7e8e7] text-[#686a6b] dark:bg-white/[0.07] dark:text-[#b4b4af]">
          <ShieldAlert size={24} />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-[#1e2233] dark:text-white">
            Sign in to view this page
          </h1>
          <p className="max-w-sm text-sm text-[#686a6b] dark:text-[#b4b4af]">
            Your account, courses and orders are tied to your profile.
          </p>
        </div>
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-full bg-[#1683f6] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Sign in
          </button>
        </SignInButton>
      </div>
    )
  }

  return <>{children}</>
}
