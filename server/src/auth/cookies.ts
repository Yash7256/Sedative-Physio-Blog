import type { Response } from "express"

export const REFRESH_COOKIE_NAME = "refresh_token"
export const REFRESH_COOKIE_PATH = "/api/auth"
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: REFRESH_COOKIE_PATH,
} as const

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, { ...REFRESH_COOKIE_OPTIONS, maxAge: REFRESH_TOKEN_TTL_MS })
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS)
}