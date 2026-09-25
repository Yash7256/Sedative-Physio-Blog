import { COMMON_PASSWORDS } from "./common-passwords.js"

export const PASSWORD_MIN_LENGTH = 12

/**
 * Leet-speak substitutions applied before blocklist lookup, so "p@ssw0rd"
 * is recognized as the common password "password". Length + blocklist stay
 * the source of truth; no character-class rules.
 */
const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
}

function stripTrailingDigits(value: string): string {
  return value.replace(/\d+$/, "")
}

function leetNormalize(value: string): string {
  let out = ""
  for (const char of value) out += LEET_MAP[char] ?? char
  return out
}

/** True if the password matches the top-10k blocklist, directly or via leet/typo variants. */
export function isCommonPassword(password: string): boolean {
  const normalized = password.toLowerCase().trim()
  if (COMMON_PASSWORDS.has(normalized)) return true

  const withoutSuffixDigits = stripTrailingDigits(normalized)
  if (withoutSuffixDigits !== normalized && COMMON_PASSWORDS.has(withoutSuffixDigits)) {
    return true
  }

  const leet = stripTrailingDigits(leetNormalize(stripTrailingDigits(normalized)))
  if (leet !== normalized && COMMON_PASSWORDS.has(leet)) return true

  return false
}

/** Returns a human-readable reason the password is rejected, or null if it passes. */
export function validatePasswordPolicy(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
  }
  if (isCommonPassword(password)) {
    return "Password is too common; please choose a more unique one."
  }
  return null
}