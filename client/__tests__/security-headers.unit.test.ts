import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

interface VercelHeader {
  key: string
  value: string
}

interface VercelHeaderRule {
  source: string
  headers: VercelHeader[]
}

function spaHeaders(): Map<string, string> {
  const path = resolve(process.cwd(), "../vercel.json")
  const config = JSON.parse(readFileSync(path, "utf8")) as { headers?: VercelHeaderRule[] }
  const rule = config.headers?.find((entry) => entry.source === "/((?!api/).*)")
  return new Map((rule?.headers ?? []).map((header) => [header.key, header.value]))
}

describe("SPA security headers", () => {
  it("sets report-only CSP and baseline hardening headers on the SPA route", () => {
    const headers = spaHeaders()

    expect(headers.has("Content-Security-Policy")).toBe(false)
    const csp = headers.get("Content-Security-Policy-Report-Only") ?? ""
    for (const directive of [
      "default-src 'self'",
      "frame-ancestors 'none'",
      "script-src 'self'",
      "'sha256-1zTADRzCc1CacVK11mCP3vaaNO/uzKGdoLT+VY6zqHg='",
      "worker-src blob:",
      "style-src 'self' 'unsafe-inline' https://*.clerk.com https://api.fontshare.com https://fonts.googleapis.com",
      "font-src 'self' data: https://cdn.fontshare.com https://fonts.gstatic.com",
      "img-src 'self' data: https://i.ibb.co https://images.unsplash.com",
      "connect-src 'self'",
      "https://checkout.razorpay.com",
    ]) {
      expect(csp).toContain(directive)
    }

    expect(headers.get("X-Frame-Options")).toBe("DENY")
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin")
    expect(headers.get("Permissions-Policy")).toContain("camera=()")
    expect(headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains; preload",
    )
  })
})
