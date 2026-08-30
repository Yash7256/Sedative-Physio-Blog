import { useState } from "react"
import { useSignUp } from "@clerk/react"

interface RegisterFormProps {
  onSuccess: () => void
  onSwitchToLogin: () => void
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { signUp } = useSignUp()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string
    lastName?: string
    email?: string
    password?: string
  }>({})
  const [clerkError, setClerkError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!signUp) return

    // Client-side validation — check each field is non-empty and non-whitespace
    const errors: {
      firstName?: string
      lastName?: string
      email?: string
      password?: string
    } = {}
    if (!firstName.trim()) errors.firstName = "First name is required."
    if (!lastName.trim()) errors.lastName = "Last name is required."
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
      const { error } = await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      })

      if (error) {
        setClerkError(error.message ?? "Registration failed")
        return
      }

      if (signUp.status === "complete") {
        await signUp.finalize()
        onSuccess()
      }
    } catch (err: unknown) {
      const message =
        (err as any).errors?.[0]?.message ?? "Registration failed"
      setClerkError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const inputClassName =
    "w-full rounded-[5px] border border-border px-3 py-2 text-sm text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* First name + Last name side-by-side */}
      <div className="grid grid-cols-2 gap-3">
        {/* First name */}
        <div className="flex flex-col gap-1">
          <label htmlFor="register-first-name" className="text-sm font-medium text-ink">
            First name
          </label>
          <input
            id="register-first-name"
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jane"
            className={inputClassName}
            aria-describedby={fieldErrors.firstName ? "register-first-name-error" : undefined}
            aria-invalid={!!fieldErrors.firstName}
          />
          {fieldErrors.firstName && (
            <p id="register-first-name-error" className="text-xs text-destructive">
              {fieldErrors.firstName}
            </p>
          )}
        </div>

        {/* Last name */}
        <div className="flex flex-col gap-1">
          <label htmlFor="register-last-name" className="text-sm font-medium text-ink">
            Last name
          </label>
          <input
            id="register-last-name"
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            className={inputClassName}
            aria-describedby={fieldErrors.lastName ? "register-last-name-error" : undefined}
            aria-invalid={!!fieldErrors.lastName}
          />
          {fieldErrors.lastName && (
            <p id="register-last-name-error" className="text-xs text-destructive">
              {fieldErrors.lastName}
            </p>
          )}
        </div>
      </div>

      {/* Email field */}
      <div className="flex flex-col gap-1">
        <label htmlFor="register-email" className="text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClassName}
          aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
          aria-invalid={!!fieldErrors.email}
        />
        {fieldErrors.email && (
          <p id="register-email-error" className="text-xs text-destructive">
            {fieldErrors.email}
          </p>
        )}
      </div>

      {/* Password field */}
      <div className="flex flex-col gap-1">
        <label htmlFor="register-password" className="text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={inputClassName}
          aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password && (
          <p id="register-password-error" className="text-xs text-destructive">
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
        disabled={isLoading}
        className="inline-flex h-[35px] w-full items-center justify-center gap-2 rounded-[5px] bg-ink px-4 text-sm text-canvas transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {isLoading ? (
          <>
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-canvas/30 border-t-canvas"
            />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </button>

      {/* Switch to Login */}
      <p className="text-center text-sm text-slate">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-medium text-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
        >
          Log In
        </button>
      </p>
    </form>
  )
}
