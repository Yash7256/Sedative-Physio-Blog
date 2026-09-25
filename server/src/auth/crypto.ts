import * as argon2 from "argon2"
import { createHash, randomBytes } from "node:crypto"
import { SignJWT, importPKCS8, importSPKI, jwtVerify } from "jose"

/**
 * RS256 keypair for access-token signing/verification, read from env:
 *
 *   AUTH_JWT_PRIVATE_KEY — base64-encoded PEM (PKCS#8) RSA private key, signs access tokens
 *   AUTH_JWT_PUBLIC_KEY  — base64-encoded PEM (PKCS#8) RSA public key,  verifies access tokens
 *
 * Values are the base64 encoding of the PEM so they fit on a single line in
 * `.env`. Generate them with:
 *
 *   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwt-key.pem
 *   openssl pkey -in jwt-key.pem -pubout -out jwt-key.pub.pem
 *   base64 -w0 jwt-key.pem      # -> AUTH_JWT_PRIVATE_KEY
 *   base64 -w0 jwt-key.pub.pem  # -> AUTH_JWT_PUBLIC_KEY
 *
 * Key material is never generated or committed by this code.
 */

/** Access tokens are short-lived; the refresh token keeps the session alive. */
export const ACCESS_TOKEN_TTL_SECONDS = 10 * 60

/**
 * argon2id parameters for a server environment. 64 MiB memory is comfortably
 * above the OWASP minimum (19 MiB) while staying cheap enough for interactive
 * login/register calls; production can tune these up.
 */
const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024, // KiB (64 MiB)
  timeCost: 3,
  parallelism: 4,
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS)
}

/** Returns false for both wrong passwords and malformed/mismatched hashes. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

/** Cryptographically random opaque token (256 bits of entropy) for refresh/verification tokens. */
export function generateOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url")
}

/** SHA-256 of an opaque token for at-rest storage; raw tokens are never persisted. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export interface AccessTokenClaims {
  userId: string
  role: string
}

function decodePem(encoded: string, envName: string): string {
  const pem = Buffer.from(encoded, "base64").toString("utf8")
  if (!pem.includes("BEGIN")) {
    throw new Error(`${envName} must be a base64-encoded PEM (PKCS#8) RSA key`)
  }
  return pem
}

async function signingKey() {
  const encoded = process.env.AUTH_JWT_PRIVATE_KEY
  if (!encoded) throw new Error("AUTH_JWT_PRIVATE_KEY env var is not set")
  return importPKCS8(decodePem(encoded, "AUTH_JWT_PRIVATE_KEY"), "RS256")
}

async function verificationKey() {
  const encoded = process.env.AUTH_JWT_PUBLIC_KEY
  if (!encoded) throw new Error("AUTH_JWT_PUBLIC_KEY env var is not set")
  return importSPKI(decodePem(encoded, "AUTH_JWT_PUBLIC_KEY"), "RS256")
}

/** Signs an RS256 access token with only sub, role, iat, exp — no PII. */
export async function signAccessToken(userId: string, role: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TOKEN_TTL_SECONDS)
    .sign(await signingKey())
}

/** Returns claims for valid, unexpired, RS256-signed tokens, or null otherwise. */
export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, await verificationKey(), {
      algorithms: ["RS256"],
    })
    const { sub, role } = payload
    if (typeof sub !== "string" || typeof role !== "string") return null
    return { userId: sub, role }
  } catch {
    return null
  }
}