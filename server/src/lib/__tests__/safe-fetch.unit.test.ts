import { describe, expect, it, vi } from "vitest"

async function loadSafeFetch() {
  // @ts-ignore - module created in P5
  return import("../safe-fetch.js") as Promise<any>
}

describe("safeFetchImage (F-12)", () => {
  it.fails("rejects non-https scheme", async () => {
    const { safeFetchImage } = await loadSafeFetch()
    await expect(
      safeFetchImage("http://i.ibb.co/a.png", { allowedHosts: new Set(["i.ibb.co"]) }),
    ).rejects.toThrow()
  })

  it.fails("rejects non-443 port", async () => {
    const { safeFetchImage } = await loadSafeFetch()
    await expect(
      safeFetchImage("https://i.ibb.co:8443/a.png", { allowedHosts: new Set(["i.ibb.co"]) }),
    ).rejects.toThrow()
  })

  it.fails("blocks non-allowlisted host", async () => {
    const { safeFetchImage } = await loadSafeFetch()
    await expect(
      safeFetchImage("https://evil.example/img.png", { allowedHosts: new Set(["i.ibb.co"]) }),
    ).rejects.toThrow()
  })

  it.fails("blocks userinfo trick host", async () => {
    const { safeFetchImage } = await loadSafeFetch()
    await expect(
      safeFetchImage("https://i.ibb.co@evil.example/img.png", { allowedHosts: new Set(["i.ibb.co"]) }),
    ).rejects.toThrow()
  })

  it.fails("blocks IP literals and localhost", async () => {
    const { safeFetchImage } = await loadSafeFetch()
    const allowed = new Set(["127.0.0.1", "localhost", "169.254.169.254"])
    await expect(safeFetchImage("https://127.0.0.1/img.png", { allowedHosts: allowed })).rejects.toThrow()
    await expect(safeFetchImage("https://localhost/img.png", { allowedHosts: allowed })).rejects.toThrow()
    await expect(
      safeFetchImage("https://169.254.169.254/img.png", { allowedHosts: allowed }),
    ).rejects.toThrow()
  })

  for (const [label, address, family] of [
    ["loopback v4", "127.0.0.1", 4],
    ["metadata v4", "169.254.169.254", 4],
    ["private v4", "10.0.0.5", 4],
    ["loopback v6", "::1", 6],
    ["v4-mapped loopback", "::ffff:127.0.0.1", 6],
  ] as const) {
    it.fails(`blocks allowlisted name resolving to ${label}`, async () => {
      const { safeFetchImage } = await loadSafeFetch()
      await expect(
        safeFetchImage("https://i.ibb.co/img.png", {
          allowedHosts: new Set(["i.ibb.co"]),
          lookup: async () => [{ address, family }],
        }),
      ).rejects.toThrow()
    })
  }

  it.fails("blocks redirect to a non-allowlisted or private target", async () => {
    const { safeFetchImage } = await loadSafeFetch()
    let calls = 0
    const fetchImpl = vi.fn(async () => {
      calls++
      if (calls === 1) {
        return new Response(null, { status: 302, headers: { location: "https://evil.example/img.png" } })
      }
      return new Response(Buffer.from("ok"), { status: 200, headers: { "content-type": "image/png" } })
    })
    await expect(
      safeFetchImage("https://i.ibb.co/a.png", {
        allowedHosts: new Set(["i.ibb.co"]),
        lookup: async () => [{ address: "93.184.216.34", family: 4 }],
        fetchImpl,
      }),
    ).rejects.toThrow()
  })

  it.fails("blocks too many redirects", async () => {
    const { safeFetchImage } = await loadSafeFetch()
    const fetchImpl = vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://i.ibb.co/b.png" } }))
    await expect(
      safeFetchImage("https://i.ibb.co/a.png", {
        allowedHosts: new Set(["i.ibb.co"]),
        lookup: async () => [{ address: "93.184.216.34", family: 4 }],
        fetchImpl,
        maxRedirects: 3,
      }),
    ).rejects.toThrow()
  })

  it.fails("rejects SVG or HTML content types", async () => {
    const { safeFetchImage } = await loadSafeFetch()
    const base = { allowedHosts: new Set(["i.ibb.co"]), lookup: async () => [{ address: "93.184.216.34", family: 4 }] }
    await expect(
      safeFetchImage("https://i.ibb.co/a.svg", { ...base, fetchImpl: async () => new Response("<svg/>", { status: 200, headers: { "content-type": "image/svg+xml" } }) }),
    ).rejects.toThrow()
    await expect(
      safeFetchImage("https://i.ibb.co/a.html", { ...base, fetchImpl: async () => new Response("<html>", { status: 200, headers: { "content-type": "text/html" } }) }),
    ).rejects.toThrow()
  })

  it.fails("aborts body exceeding cap without Content-Length", async () => {
    const { safeFetchImage } = await loadSafeFetch()
    const chunk = new Uint8Array(1024)
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk)
        controller.enqueue(chunk)
        controller.enqueue(chunk)
        controller.close()
      },
    })
    await expect(
      safeFetchImage("https://i.ibb.co/a.png", {
        allowedHosts: new Set(["i.ibb.co"]),
        lookup: async () => [{ address: "93.184.216.34", family: 4 }],
        fetchImpl: async () => new Response(stream, { status: 200, headers: { "content-type": "image/png" } }),
        maxBytes: 1500,
      }),
    ).rejects.toThrow()
  })

  it.fails("maps timeout to 504", async () => {
    const { safeFetchImage } = await loadSafeFetch()
    const err = Object.assign(new Error("timeout"), { name: "TimeoutError" })
    await expect(
      safeFetchImage("https://i.ibb.co/a.png", {
        allowedHosts: new Set(["i.ibb.co"]),
        lookup: async () => [{ address: "93.184.216.34", family: 4 }],
        fetchImpl: async () => { throw err },
      }),
    ).rejects.toThrow()
  })

  it.fails("happy path returns image bytes", async () => {
    const { safeFetchImage } = await loadSafeFetch()
    const buf = Buffer.from("webp")
    const body = await safeFetchImage("https://i.ibb.co/a.png", {
      allowedHosts: new Set(["i.ibb.co"]),
      lookup: async () => [{ address: "93.184.216.34", family: 4 }],
      fetchImpl: async () => new Response(buf, { status: 200, headers: { "content-type": "image/png" } }),
    })
    expect(Buffer.isBuffer(body) || body instanceof Uint8Array).toBe(true)
  })
})
