import { useEffect, useRef, useState } from "react"
import { useSignIn } from "@clerk/react"

const LAST_EMAIL_KEY = "sp_last_login_email"

interface LoginFormProps {
  onSuccess: () => void
  onSwitchToRegister: () => void
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const { signIn } = useSignIn()

  const lastEmail = typeof window !== "undefined"
    ? (localStorage.getItem(LAST_EMAIL_KEY) ?? "")
    : ""

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [clerkError, setClerkError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Pre-fill email from localStorage on mount
  useEffect(() => {
    if (lastEmail) setEmail(lastEmail)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!signIn) return

    const errors: { email?: string; password?: string } = {}
    if (!email.trim()) errors.email = "Email is required."
    if (!password.trim()) errors.password = "Password is required."

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setClerkError(null)
    setIsLoading(true)

    try {
      const { error } = await signIn.create({ identifier: email, password })

      if (error) {
        setClerkError(error.message ?? "An unexpected error occurred. Please try again.")
        return
      }

      if (signIn.status === "complete") {
        // Persist email for next visit
        localStorage.setItem(LAST_EMAIL_KEY, email.trim())
        await signIn.finalize()
        onSuccess()
      }
    } catch (err: unknown) {
      const message =
        (err as any).errors?.[0]?.message ?? "An unexpected error occurred. Please try again."
      setClerkError(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    if (!signIn) return
    setIsGoogleLoading(true)
    setClerkError(null)
    try {
      await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: window.location.origin,
        redirectCallbackUrl: window.location.origin,
      })
    } catch (err: unknown) {
      const message =
        (err as any).errors?.[0]?.message ?? "Google sign-in failed. Please try again."
      setClerkError(message)
      setIsGoogleLoading(false)
    }
  }

  // When the last-used chip is clicked: fill email and focus password
  function handleLastEmailClick() {
    setEmail(lastEmail)
    setFieldErrors({})
    setTimeout(() => passwordRef.current?.focus(), 0)
  }

  const inputClass =
    "h-[38px] rounded-[5px] border border-black/20 bg-canvas px-3 text-sm text-ink placeholder:text-slate/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"

  return (
    <div className="flex flex-col gap-4">
      {/* Continue with Google */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading || isLoading}
        className="inline-flex h-[38px] w-full items-center justify-center gap-2.5 rounded-[5px] border border-black/20 bg-canvas px-4 text-sm text-ink transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGoogleLoading ? (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink"
          />
        ) : (
          /* Google "G" SVG icon */
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-black/10" />
        <span className="text-xs text-slate">or</span>
        <div className="h-px flex-1 bg-black/10" />
      </div>

      {/* Last-used email chip */}
      {lastEmail && email !== lastEmail && (
        <button
          type="button"
          onClick={handleLastEmailClick}
          className="flex items-center gap-2 rounded-[5px] border border-black/10 bg-black/[0.03] px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-black/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-lavender text-xs font-semibold text-ink">
            {lastEmail[0].toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{lastEmail}</span>
            <span className="text-xs text-slate">Continue as this account</span>
          </div>
        </button>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* Email field */}
        <div className="flex flex-col gap-1">
          <label htmlFor="login-email" className="text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
            aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
            aria-invalid={!!fieldErrors.email}
          />
          {fieldErrors.email && (
            <p id="login-email-error" className="text-xs text-destructive">
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password field */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium text-ink">
              Password
            </label>
            <button
              type="button"
              className="text-xs text-slate transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
            >
              Forgot password?
            </button>
          </div>
          <input
            id="login-password"
            ref={passwordRef}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClass}
            aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
            aria-invalid={!!fieldErrors.password}
          />
          {fieldErrors.password && (
            <p id="login-password-error" className="text-xs text-destructive">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Clerk-level error */}
        {clerkError && (
          <div
            role="alert"
            className="rounded-[5px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {clerkError}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="inline-flex h-[35px] w-full items-center justify-center gap-2 rounded-[5px] bg-ink px-4 text-sm text-canvas transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isLoading ? (
            <>
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-canvas/30 border-t-canvas"
              />
              Signing in…
            </>
          ) : (
            "Log In"
          )}
        </button>

        {/* Switch to Register */}
        <p className="text-center text-sm text-slate">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-medium text-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
          >
            Register
          </button>
        </p>
      </form>
    </div>
  )
}
