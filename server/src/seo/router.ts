import { Router, type Response } from "express"

import { getCourseBySlug } from "../courses/service.js"
import { courseCloudinaryImage } from "../lib/cloudinary.js"
import { courseDetailLimiter } from "../lib/rate-limit.js"
import {
  allowInlineScripts,
  buildSeoHtml,
  courseJsonLd,
  safeSeoImage,
  serializeJsonLd,
  siteOrigin,
  SITE_NAME,
  type SeoHtml,
} from "./metadata.js"

export interface CoursePageRouterOptions {
  env?: NodeJS.ProcessEnv
}

const SLUG = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/

function sendHtml(res: Response, status: number, page: SeoHtml): void {
  allowInlineScripts(res, page.inlineScripts)
  res.status(status).type("html").send(page.html)
}

function notFound(): SeoHtml {
  return buildSeoHtml({ title: `Course not found | ${SITE_NAME}`, noindex: true })
}

/**
 * Public, metadata-complete HTML for `/courses/:slug`. The body is only an
 * empty SPA root; the React route fetches the same cached detail payload and
 * replaces the metadata on client-side navigation.
 */
export function createCoursePageRouter(
  { env = process.env }: CoursePageRouterOptions = {},
): Router {
  const router = Router()

  router.get("/:slug", courseDetailLimiter, async (req, res) => {
    const raw = req.params.slug
    const slug = Array.isArray(raw) ? raw[0] : raw
    if (!slug || !SLUG.test(slug)) {
      sendHtml(res, 404, notFound())
      return
    }

    try {
      const course = await getCourseBySlug(slug)
      if (!course) {
        sendHtml(res, 404, notFound())
        return
      }

      const origin = siteOrigin(env)
      const cloudinaryImage = courseCloudinaryImage(course.slug, env)
      const page = buildSeoHtml({
        title: `${course.title} | ${SITE_NAME}`,
        description: course.shortDescription,
        canonical: origin ? `${origin}/courses/${encodeURIComponent(slug)}` : null,
        image: cloudinaryImage ?? safeSeoImage(course.thumbnail, origin),
        jsonLd: serializeJsonLd(courseJsonLd(course, origin, cloudinaryImage)),
      })
      res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600, max-age=0")
      sendHtml(res, 200, page)
    } catch {
      // A store failure must not turn into an HTML page containing driver text.
      console.error("Course SEO page read failed")
      sendHtml(res, 503, buildSeoHtml({
        title: `Course temporarily unavailable | ${SITE_NAME}`,
        noindex: true,
      }))
    }
  })

  return router
}
