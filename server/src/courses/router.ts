import { Router } from "express"
import { getCourseBySlug, listCourses } from "./service.js"
import { handleError } from "../lib/errors.js"
import { catalogListLimiter, courseDetailLimiter } from "../lib/rate-limit.js"
import { CATALOG_CACHE_POLICY, catalogCache } from "../lib/catalog-cache.js"
import { parsePageRequest } from "../lib/pagination.js"

export const coursesRouter = Router()

// Catalog reads opt into short shared caching; the in-memory layer sits in
// front of the service, and a version bump invalidates every cursor variant.
const listCache = catalogCache.middleware({
  catalog: "courses",
  policy: CATALOG_CACHE_POLICY,
  allowedParams: ["limit", "cursor"],
})
const detailCache = catalogCache.middleware({ catalog: "courses", policy: CATALOG_CACHE_POLICY })

// GET /api/courses — list published courses, cursor-paginated
coursesRouter.get("/", catalogListLimiter, listCache, async (req, res) => {
  try {
    const page = await listCourses(parsePageRequest(req.query))
    res.status(200).json(page)
  } catch (err) {
    handleError(err, res, req)
  }
})

// GET /api/courses/:slug — course details with syllabus and tutor
coursesRouter.get("/:slug", courseDetailLimiter, detailCache, async (req, res) => {
  try {
    const slugParam = req.params.slug
    const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam
    if (!slug) {
      res.status(400).json({ error: "Slug is required" })
      return
    }
    const course = await getCourseBySlug(slug)
    if (!course) {
      res.status(404).json({ error: "Course not found" })
      return
    }
    res.status(200).json(course)
  } catch (err) {
    handleError(err, res, req)
  }
})
