import type { CourseDetail } from "./resources"

const SITE_NAME = "Sedative Physio"

/** Delimiters in a title must not be able to masquerade as markup in the shell. */
function escapeTitleText(value: string): string {
  return value.replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Use the browser's current origin, unless a caller supplies a canonical one. */
function normalizeOrigin(origin: string): string | null {
  try {
    const url = new URL(origin)
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null
  } catch {
    return null
  }
}

/** Catalog images must stay same-origin; never turn a DB string into a tracker. */
function safeSeoImage(value: string | null, origin: string | null): string | null {
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

/** Paise in the API, decimal string in schema.org offers. */
function courseSeoPrice(paise: number): string {
  const rupees = paise / 100
  return rupees.toFixed(Number.isInteger(rupees) ? 0 : 2)
}

function serializeJsonLd(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
}

function addHeadTag<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  marker: string,
  attributes: Record<string, string>,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  element.setAttribute("data-course-seo", marker)
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
  document.head.appendChild(element)
  return element
}

/**
 * Mirror the server shell's metadata on client-side navigation. Every tag this
 * function owns is marked, so a second call replaces rather than duplicates it
 * and the returned cleanup cannot remove an unrelated site tag.
 */
export function applyCourseSeo(course: CourseDetail, origin = window.location.origin): () => void {
  for (const node of document.querySelectorAll("[data-course-seo]")) node.remove()

  const previousTitle = document.title
  document.title = `${escapeTitleText(course.title)} | ${SITE_NAME}`
  const siteOrigin = normalizeOrigin(origin)
  const canonical = siteOrigin ? `${siteOrigin}/courses/${encodeURIComponent(course.slug)}` : null
  const image = safeSeoImage(course.thumbnail, siteOrigin)
  const created: Element[] = []

  const meta = (marker: string, attribute: "name" | "property", key: string, value: string) =>
    created.push(addHeadTag("meta", marker, { [attribute]: key, content: value }))
  const description = course.shortDescription ?? ""

  if (description) meta("description", "name", "description", description)
  if (canonical) {
    created.push(addHeadTag("link", "canonical", { rel: "canonical", href: canonical }))
    meta("og:url", "property", "og:url", canonical)
  }
  meta("og:type", "property", "og:type", "website")
  meta("og:site_name", "property", "og:site_name", SITE_NAME)
  meta("og:title", "property", "og:title", course.title)
  if (description) meta("og:description", "property", "og:description", description)
  if (image) meta("og:image", "property", "og:image", image)
  meta("twitter:card", "name", "twitter:card", image ? "summary_large_image" : "summary")
  meta("twitter:title", "name", "twitter:title", course.title)
  if (description) meta("twitter:description", "name", "twitter:description", description)
  if (image) meta("twitter:image", "name", "twitter:image", image)

  const jsonLd = addHeadTag("script", "jsonld", { type: "application/ld+json" })
  jsonLd.textContent = serializeJsonLd({
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description,
    ...(canonical ? { url: canonical } : {}),
    ...(image ? { image } : {}),
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      ...(siteOrigin ? { url: siteOrigin } : {}),
    },
    offers: {
      "@type": "Offer",
      price: courseSeoPrice(course.price),
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      ...(canonical ? { url: canonical } : {}),
    },
  })
  created.push(jsonLd)

  return () => {
    for (const node of created) node.remove()
    document.title = previousTitle
  }
}
