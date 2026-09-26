import express from "express"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { cacheControl, fileEtag, NO_STORE, noStore } from "../cache.js"

/**
 * Driven over a real socket with fetch rather than an in-process request
 * helper, because the behaviour under test is header emission on the wire —
 * including the 304 path, where a body-less response and the absence of an
 * ETag are the entire point.
 *
 * `noStore` is the app-wide default and `cacheControl` is the per-route opt-in,
 * so what matters is the interaction: a public route must still be able to
 * claim its own policy, and a 304 must never inherit the stricter default.
 * Getting the second wrong is silent — the endpoint keeps returning correct
 * data while quietly losing its cache.
 */
function buildApp() {
  const a = express()
  // Mirrors app.ts. Express generates its own body-length ETag unless this is
  // off, and an uncacheable response carrying a validator is a contradiction
  // worth catching: intermediaries key on the ETag, so leaving it enabled would
  // reintroduce the shared-cache coupling `noStore` exists to remove.
  a.set("etag", false)
  a.use(noStore())

  a.get("/public", cacheControl({ browser: 60, cdn: 300, swr: 86400 }), (_req, res) => {
    res.json({ items: [1, 2, 3] })
  })
  a.get("/private", (_req, res) => {
    res.json({ secret: "per-user" })
  })
  a.get("/fails", cacheControl({ browser: 60 }), (_req, res) => {
    res.status(500).json({ error: "boom" })
  })
  // Mirrors images/ and notes/:id/file, which hand-roll their headers and used
  // to return 304 before setting Cache-Control.
  a.get("/file", (req, res) => {
    const etag = fileEtag("notes/abc.pdf", 1024)
    res.setHeader("Cache-Control", "public, max-age=86400")
    res.setHeader("ETag", etag)
    if (req.headers["if-none-match"] === etag) {
      res.status(304).end()
      return
    }
    res.status(200).send("bytes")
  })
  a.post("/mutate", (_req, res) => {
    res.json({ ok: true })
  })

  return a
}

let server: ReturnType<ReturnType<typeof express>["listen"]>
let base: string

beforeAll(async () => {
  server = buildApp().listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  const address = server.address()
  base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
})

const cc = (res: Response) => res.headers.get("cache-control")

describe("noStore default", () => {
  it("marks an undecorated response uncacheable", async () => {
    const res = await fetch(`${base}/private`)
    expect(cc(res)).toBe(NO_STORE)
  })

  it("applies to error responses too", async () => {
    // A 4xx/5xx body can carry user-specific detail; caching one is a leak.
    const res = await fetch(`${base}/missing`)
    expect(res.status).toBe(404)
    expect(cc(res)).toBe(NO_STORE)
  })

  it("applies to non-GET responses", async () => {
    const res = await fetch(`${base}/mutate`, { method: "POST" })
    expect(cc(res)).toBe(NO_STORE)
  })

  it("never emits an ETag, so no conditional request can be answered", async () => {
    const res = await fetch(`${base}/private`)
    expect(res.headers.get("etag")).toBeNull()
  })
})

describe("cacheControl opt-in", () => {
  it("overrides the default on a 200", async () => {
    const res = await fetch(`${base}/public`)
    expect(cc(res)).toBe(
      "public, s-maxage=300, max-age=60, stale-while-revalidate=86400",
    )
  })

  it("leaves an error response on the stricter default", async () => {
    // Setting the public policy before the status is known would make a 500
    // from a cached route cacheable.
    const res = await fetch(`${base}/fails`)
    expect(res.status).toBe(500)
    expect(cc(res)).toBe(NO_STORE)
  })

  it("answers a matching If-None-Match with a body-less 304", async () => {
    const first = await fetch(`${base}/public`)
    const etag = first.headers.get("etag")!
    expect(etag).toMatch(/^W\//)

    const second = await fetch(`${base}/public`, { headers: { "If-None-Match": etag } })
    expect(second.status).toBe(304)
    expect(await second.text()).toBe("")
  })
})

describe("304 responses keep their own policy", () => {
  it("does not downgrade a file revalidation to no-store", async () => {
    const first = await fetch(`${base}/file`)
    expect(cc(first)).toBe("public, max-age=86400")

    const second = await fetch(`${base}/file`, {
      headers: { "If-None-Match": first.headers.get("etag")! },
    })

    expect(second.status).toBe(304)
    // A 304 carrying `no-store` tells the client to discard the entry it just
    // revalidated, so the cache would never actually get used.
    expect(cc(second)).toBe("public, max-age=86400")
  })
})

describe("fileEtag", () => {
  it("is stable for the same key and size", () => {
    expect(fileEtag("notes/a.pdf", 10)).toBe(fileEtag("notes/a.pdf", 10))
  })

  it("changes when the size changes", () => {
    expect(fileEtag("notes/a.pdf", 10)).not.toBe(fileEtag("notes/a.pdf", 11))
  })

  it("changes when the key changes", () => {
    expect(fileEtag("notes/a.pdf", 10)).not.toBe(fileEtag("notes/b.pdf", 10))
  })

  it("treats a missing size as zero rather than throwing", () => {
    expect(fileEtag("notes/a.pdf", undefined)).toBe(fileEtag("notes/a.pdf", 0))
  })
})
