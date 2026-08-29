type ClerkLikeError = Error & {
  errors?: { message?: string }[]
}

/**
 * Extracts a human-readable message from a thrown error (including Clerk API
 * errors, whose details live in `error.errors[]`).
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const err = error as ClerkLikeError
    const clerkMsg = err.errors?.[0]?.message
    if (clerkMsg) return clerkMsg
  }
  if (error instanceof Error && error.message) {
    return error.message.replace(/^[\w-]+: /, "")
  }
  return fallback
}
