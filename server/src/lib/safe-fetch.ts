import { lookup as dnsLookup } from "node:dns/promises"
import { BlockList, isIP } from "node:net"

/** Thrown for every rejected source. Callers map it to a client-safe 400. */
export class UnsafeImageError extends Error {
  constructor(message = "Unsafe image source") {
    super(message)
    this.name = "UnsafeImageError"
  }
}

type LookupResult = { address: string; family: number }
type LookupFn = (hostname: string, options: { all: true }) => Promise<LookupResult[]>

export interface SafeFetchImageOptions {
  allowedHosts?: Set<string>
  lookup?: LookupFn
  fetchImpl?: typeof fetch
  maxBytes?: number
  timeoutMs?: number
  maxRedirects?: number
  env?: NodeJS.ProcessEnv
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 8000
const DEFAULT_MAX_REDIRECTS = 3
const DEFAULT_ALLOWED_HOSTS = ["i.ibb.co", "images.unsplash.com"]

function buildBlockedAddresses(): BlockList {
  const list = new BlockList()

  for (const [network, prefix] of [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ] as const) {
    list.addSubnet(network, prefix, "ipv4")
  }

  for (const [network, prefix] of [
    ["::", 128],
    ["::1", 128],
    ["fc00::", 7],
    ["fe80::", 10],
    ["2001:db8::", 32],
  ] as const) {
    list.addSubnet(network, prefix, "ipv6")
  }

  return list
}

const blockedAddresses = buildBlockedAddresses()

function normalizeHost(hostname: string): string {
  const lower = hostname.toLowerCase()
  return lower.startsWith("[") && lower.endsWith("]") ? lower.slice(1, -1) : lower
}

function normalizeAddress(address: string): string {
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address)
  return mapped?.[1] ?? address
}

function isBlockedAddress(address: string): boolean {
  const normalized = normalizeAddress(address)
  const version = normalized.includes(":") ? "ipv6" : "ipv4"
  return blockedAddresses.check(normalized, version)
}

function defaultAllowedHosts(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const configured = env.IMAGE_PROXY_ALLOWED_HOSTS
  const hosts = configured
    ? configured.split(",").map((host) => host.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ALLOWED_HOSTS
  return new Set(hosts)
}

/** Validate every part an attacker can control before any lookup or fetch. */
function validateSourceUrl(raw: string, allowedHosts: Set<string>): { url: URL; hostname: string } {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new UnsafeImageError("Invalid image URL")
  }

  if (url.protocol !== "https:") throw new UnsafeImageError("Only HTTPS image sources are allowed")
  if (url.port && url.port !== "443") throw new UnsafeImageError("Only port 443 is allowed")
  if (url.username || url.password) throw new UnsafeImageError("Userinfo is not allowed")

  const hostname = normalizeHost(url.hostname)
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new UnsafeImageError("Local hosts are not allowed")
  }
  if (!allowedHosts.has(hostname)) throw new UnsafeImageError("Image host is not allowlisted")
  if (isIP(hostname) !== 0 && isBlockedAddress(hostname)) {
    throw new UnsafeImageError("Private addresses are not allowed")
  }

  return { url, hostname }
}

async function assertDnsSafe(hostname: string, lookup: LookupFn): Promise<void> {
  const addresses = await lookup(hostname, { all: true })
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new UnsafeImageError("Image host did not resolve")
  }
  for (const address of addresses) {
    if (isBlockedAddress(address.address)) {
      throw new UnsafeImageError("Image host resolved to a private address")
    }
  }
}

async function readCappedBody(body: ReadableStream<Uint8Array>, maxBytes: number): Promise<Uint8Array> {
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw new UnsafeImageError("Source image is too large")
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }
  return output
}

function looksLikeSvg(bytes: Uint8Array): boolean {
  const head = Buffer.from(bytes.subarray(0, 512)).toString("utf8").trimStart().toLowerCase()
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))
}

/**
 * Fetch an images.unsplash.com/i.ibb.co image without giving user input a path
 * to internal network addresses. Redirects are followed manually so every
 * target gets the same URL, allowlist, DNS and response checks.
 */
export async function safeFetchImage(
  rawSrc: string,
  {
    allowedHosts,
    lookup = (hostname) => dnsLookup(hostname, { all: true }),
    fetchImpl = fetch,
    maxBytes = DEFAULT_MAX_BYTES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    env = process.env,
  }: SafeFetchImageOptions,
): Promise<Uint8Array> {
  const hosts = allowedHosts ?? defaultAllowedHosts(env)
  let current = rawSrc

  for (let redirects = 0; ; redirects++) {
    const { url, hostname } = validateSourceUrl(current, hosts)
    await assertDnsSafe(hostname, lookup)

    let response: Response
    try {
      response = await fetchImpl(url.toString(), {
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "user-agent": "SedativePhysioImageConverter/1.0", accept: "image/*" },
      })
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new UnsafeImageError("Image source timed out")
      }
      throw err
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirects >= maxRedirects) throw new UnsafeImageError("Too many redirects")
      const location = response.headers.get("location")
      if (!location) throw new UnsafeImageError("Redirect without a location")
      current = new URL(location, url).toString()
      continue
    }

    if (!response.ok || !response.body) {
      throw new UnsafeImageError("Could not fetch the source image")
    }

    const contentType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? ""
    if (!contentType.startsWith("image/") || contentType === "image/svg+xml") {
      throw new UnsafeImageError("Unsupported image content type")
    }

    const bytes = await readCappedBody(response.body, maxBytes)
    if (looksLikeSvg(bytes)) throw new UnsafeImageError("SVG images are not allowed")
    return bytes
  }
}
