import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it, vi } from "vitest"

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..")

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      return name === "__tests__" ? [] : sourceFiles(path)
    }
    return extname(path) === ".ts" ? [path] : []
  })
}

describe("configuration error hygiene", () => {
  it("does not put environment variable names or .env paths in thrown errors", () => {
    const leaks: string[] = []
    for (const file of sourceFiles(sourceRoot)) {
      const source = readFileSync(file, "utf8")
      for (const match of source.matchAll(/throw\s+new\s+\w+\s*\(([\s\S]{0,400}?)\)/g)) {
        if (/RAZORPAY_|CLERK_|UPSTASH_|IMAGE_PROXY_|\.env/.test(match[0])) {
          leaks.push(`${file}: ${match[0].replace(/\s+/g, " ").trim()}`)
        }
      }
    }
    expect(leaks).toEqual([])
  })

  it("returns a generic error when the Clerk server key is missing", async () => {
    vi.resetModules()
    vi.stubEnv("CLERK_SECRET_KEY", "")
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const { getClerkClient } = await import("../clerk.js")

    let message = ""
    try {
      getClerkClient()
    } catch (err) {
      message = err instanceof Error ? err.message : String(err)
    }
    const logged = JSON.stringify(log.mock.calls)
    log.mockRestore()
    vi.unstubAllEnvs()

    expect(message).toMatch(/temporarily unavailable/i)
    expect(message).not.toMatch(/CLERK_|\.env/)
    expect(logged).toContain("CLERK_SECRET_KEY")
  })

  it("returns a generic error when the Clerk webhook secret is missing", async () => {
    vi.resetModules()
    vi.stubEnv("CLERK_WEBHOOK_SECRET", "")
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const { verifyClerkEvent } = await import("../../auth/services/webhook-verify.js")

    let message = ""
    try {
      verifyClerkEvent("{}", {})
    } catch (err) {
      message = err instanceof Error ? err.message : String(err)
    }
    const logged = JSON.stringify(log.mock.calls)
    log.mockRestore()
    vi.unstubAllEnvs()

    expect(message).toMatch(/temporarily unavailable/i)
    expect(message).not.toMatch(/CLERK_|\.env/)
    expect(logged).toContain("CLERK_WEBHOOK_SECRET")
  })
})
