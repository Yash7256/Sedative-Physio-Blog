import { Router } from "express"
import { getCourseBySlug, listCourses } from "./service.js"
import { handleError } from "../lib/errors.js"
import { cacheControl } from "../lib/cache.js"

export const coursesRouter = Router()

// Catalog data is near-immutable: cache at the CDN for 5 min, browser for 1 min,
// and keep serving stale copies for a day while revalidating in the background.
const catalogCache = cacheControl({ browser: 60, cdn: 300, swr: 86400 })

// GET /api/courses — list published courses
coursesRouter.get("/", catalogCache, async (_req, res) => {
  try {
    const courses = await listCourses()
    res.status(200).json(courses)
  } catch (err) {
    handleError(err, res)
  }
})

// GET /api/courses/:slug — course details with syllabus and tutor
coursesRouter.get("/:slug", catalogCache, async (req, res) => {
  try {
    const slug = req.params.slug
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
    handleError(err, res)
  }
})