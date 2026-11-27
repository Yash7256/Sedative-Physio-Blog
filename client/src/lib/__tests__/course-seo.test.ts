import { afterEach, describe, expect, it, vi } from "vitest"

import { applyCourseSeo } from "../course-seo"
import type { CourseDetail } from "../resources"

const detail: CourseDetail = {
  id: "c1",
  title: "Clinical Reasoning",
  slug: "clinical-reasoning",
  shortDescription: "Learn a repeatable assessment workflow.",
  thumbnail: "/courses/clinical-reasoning.png",
  level: "Beginner",
  language: "English",
  estimatedHours: 8,
  price: 49900,
  isFree: false,
  highlights: [],
  sections: [],
  tutor: null,
}

function attr(selector: string, name: string): string | null {
  return document.querySelector(selector)?.getAttribute(name) ?? null
}

afterEach(() => {
  for (const node of document.querySelectorAll("[data-course-seo]")) node.remove()
  document.title = ""
  vi.unstubAllEnvs()
})

describe("course SEO metadata", () => {
  it("sets and removes canonical, description, social and JSON-LD tags", () => {
    const restore = applyCourseSeo(detail, "https://sedative.test")

    expect(document.title).toBe("Clinical Reasoning | Sedative Physio")
    expect(attr('meta[data-course-seo="description"]', "content")).toBe(detail.shortDescription)
    expect(attr('link[data-course-seo="canonical"]', "href")).toBe(
      "https://sedative.test/courses/clinical-reasoning",
    )
    expect(attr('meta[data-course-seo="og:image"]', "content")).toBe(
      "https://sedative.test/courses/clinical-reasoning.png",
    )
    expect(attr('meta[data-course-seo="twitter:card"]', "content")).toBe("summary_large_image")
    expect(document.querySelector('script[data-course-seo="jsonld"]')?.textContent)
      .toContain('"@type":"Course"')

    restore()
    expect(document.querySelectorAll("[data-course-seo]")).toHaveLength(0)
    expect(document.title).toBe("")
  })

  it("uses the Cloudinary social image when configured", () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "demo")
    const restore = applyCourseSeo({
      ...detail,
      thumbnail: "https://images.unsplash.com/photo-1?w=400",
    }, "https://sedative.test")

    expect(attr('meta[data-course-seo="og:image"]', "content")).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,w_1200,h_675/courses/clinical-reasoning",
    )
    expect(document.querySelector('script[data-course-seo="jsonld"]')?.textContent)
      .toContain("res.cloudinary.com/demo")

    restore()
  })

  it("escapes catalog text and ignores an off-origin image", () => {
    const restore = applyCourseSeo({
      ...detail,
      title: `</title><script>alert(1)</script>`,
      shortDescription: `" onload="alert(1)`,
      thumbnail: "https://evil.example/tracker.png",
    }, "https://sedative.test")

    const json = document.querySelector('script[data-course-seo="jsonld"]')?.textContent ?? ""

    expect(document.title).toContain("&lt;/title&gt;")
    expect(json).not.toContain("<script>")
    expect(attr('meta[data-course-seo="og:image"]', "content")).toBeNull()
    expect(attr('meta[data-course-seo="description"]', "content")).toBe(`" onload="alert(1)`)

    restore()
  })
})
