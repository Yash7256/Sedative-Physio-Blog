import { createHash } from "node:crypto"

import type { CourseDetail } from "../courses/service.js"

export const SITE_NAME = "Sedative Physio"

/** Text nodes (title) need markup delimiters escaped; quotes are harmless there. */
function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Attribute values additionally need quotes escaped so a DB string cannot break out. */
function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

/**
 * Absolute URLs in metadata must come from an operator-controlled origin. A
 * missing or malformed value omits those tags rather than guessing from a
 * request header, which is client-controlled.
 */
export function siteOrigin(env: NodeJS.ProcessEnv = process.env): string | null {
  const configured = env.PUBLIC_SITE_URL ??
    (env.CORS_ALLOWED_ORIGINS ?? "").split(",")[0] ?? ""
  try {
    const url = new URL(configured.trim())
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null
  } catch {
    return null
  }
}

/** Only same-origin course art may become an social preview image. */
export function safeSeoImage(value: string | null | undefined, origin: string | null): string | null {
  if (!value || typeof value !== "string" || !origin) return null
  if (/^\/(?!\/|\\).*/.test(value)) return `${origin}${value}`
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" && url.protocol !== "http:") return null
    return url.origin === origin ? url.toString() : null
  } catch {
    return null
  }
}

/** Paise in the DB, decimal string in schema.org offers. */
export function courseSeoPrice(paise: number): string {
  const rupees = paise / 100
  return rupees.toFixed(Number.isInteger(rupees) ? 0 : 2)
}

export function courseJsonLd(
  course: CourseDetail,
  origin: string | null,
  imageOverride?: string | null,
) {
  const url = origin ? `${origin}/courses/${encodeURIComponent(course.slug)}` : undefined
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.shortDescription ?? "",
    ...(url ? { url } : {}),
    ...(course.thumbnail || imageOverride
      ? { image: imageOverride ?? safeSeoImage(course.thumbnail, origin) ?? undefined }
      : {}),
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      ...(origin ? { url: origin } : {}),
    },
    offers: {
      "@type": "Offer",
      price: courseSeoPrice(course.price),
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      ...(url ? { url } : {}),
    },
  }
}

/** `<` must not be able to close the JSON-LD script element. */
export function serializeJsonLd(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
}

/** Kept in sync with the theme bootstrap in client/index.html. */
const THEME_SCRIPT = `try {
  if (localStorage.getItem("sedative-physio-theme") === "dark") {
    document.documentElement.classList.add("dark")
  }
} catch {}`

export interface SeoPage {
  title: string
  description?: string | null
  canonical?: string | null
  image?: string | null
  jsonLd?: string | null
  noindex?: boolean
}

export interface SeoHtml {
  html: string
  /** Exact inline script sources, used to allow only these through CSP. */
  inlineScripts: string[]
}

/** Metadata-complete shell with an empty root for the SPA to take over. */
export function buildSeoHtml(page: SeoPage): SeoHtml {
  const meta = (attribute: "name" | "property", key: string, value: string, marker = key) =>
    `<meta data-course-seo="${escapeAttribute(marker)}" ${attribute}="${escapeAttribute(key)}" content="${escapeAttribute(value)}">`
  const inlineScripts = [THEME_SCRIPT]
  const jsonLdScript = page.jsonLd
    ? `<script data-course-seo="jsonld" type="application/ld+json">${page.jsonLd}</script>`
    : ""
  if (page.jsonLd) inlineScripts.push(page.jsonLd)

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/favicon-512.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<title>${escapeText(page.title)}</title>
${page.description ? meta("name", "description", page.description) : ""}
${page.canonical ? `<link data-course-seo="canonical" rel="canonical" href="${escapeAttribute(page.canonical)}">` : ""}
${page.noindex ? meta("name", "robots", "noindex") : ""}
${meta("property", "og:type", "website", "og:type")}
${meta("property", "og:site_name", SITE_NAME, "og:site_name")}
${meta("property", "og:title", page.title, "og:title")}
${page.description ? meta("property", "og:description", page.description, "og:description") : ""}
${page.canonical ? meta("property", "og:url", page.canonical, "og:url") : ""}
${page.image ? meta("property", "og:image", page.image, "og:image") : ""}
${meta("name", "twitter:card", page.image ? "summary_large_image" : "summary", "twitter:card")}
${meta("name", "twitter:title", page.title, "twitter:title")}
${page.description ? meta("name", "twitter:description", page.description, "twitter:description") : ""}
${page.image ? meta("name", "twitter:image", page.image, "twitter:image") : ""}
${jsonLdScript}
<script>${THEME_SCRIPT}</script>
<link rel="stylesheet" href="/assets/index.css">
</head>
<body>
<div id="root"></div>
<script type="module" src="/assets/main.js"></script>
</body>
</html>`

  return { html, inlineScripts }
}

/**
 * Helmet sets a default CSP on the Express app. Patch its script-src instead of
 * replacing the whole policy, so the shell's two inline scripts are permitted
 * without weakening any other directive.
 */
export function allowInlineScripts(res: {
  getHeader: (name: string) => number | string | string[] | undefined
  setHeader: (name: string, value: string) => unknown
}, sources: readonly string[]): void {
  if (sources.length === 0) return
  const hashes = sources
    .map((source) => `'sha256-${createHash("sha256").update(source).digest("base64")}'`)
    .join(" ")
  const current = res.getHeader("Content-Security-Policy")
  let policy = typeof current === "string" && current.length > 0
    ? current
    : "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'"
  const scriptDirective = policy.match(/(?:^|;\s*)script-src\s+[^;]*/)
  policy = scriptDirective
    ? policy.replace(scriptDirective[0], `${scriptDirective[0]} ${hashes}`)
    : `${policy}; script-src 'self' ${hashes}`
  res.setHeader("Content-Security-Policy", policy)
}
