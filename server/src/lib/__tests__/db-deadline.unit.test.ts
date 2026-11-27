import { describe, expect, it } from "vitest"

import {
  CATALOG_DB_TIMEOUT_MS,
  catalogDbTimeoutMs,
  withDeadline,
} from "../deadline.js"
import { ServiceUnavailableError } from "../errors.js"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("catalog DB deadline", () => {
  it("keeps a fast result and its value", async () => {
    await expect(withDeadline(Promise.resolve("row"), 50)).resolves.toBe("row")
    expect(CATALOG_DB_TIMEOUT_MS).toBeGreaterThan(0)
  })

  it("maps a slow query to a generic 503 without echoing the cause", async () => {
    const slow = delay(40).then(() => "row")
    const error = await withDeadline(slow, 5).catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ServiceUnavailableError)
    expect((error as ServiceUnavailableError).statusCode).toBe(503)
    expect((error as Error).message).toBe("Catalog data is temporarily unavailable.")
  })

  it("accepts only a positive integer timeout override", () => {
    expect(catalogDbTimeoutMs({ CATALOG_DB_TIMEOUT_MS: "25" })).toBe(25)
    expect(catalogDbTimeoutMs({ CATALOG_DB_TIMEOUT_MS: "0" })).toBe(CATALOG_DB_TIMEOUT_MS)
    expect(catalogDbTimeoutMs({ CATALOG_DB_TIMEOUT_MS: "abc" })).toBe(CATALOG_DB_TIMEOUT_MS)
  })
})
