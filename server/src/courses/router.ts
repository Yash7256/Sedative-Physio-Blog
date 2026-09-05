import { Router } from "express"
import { listCourses } from "./service.js"
import { handleError } from "../enrollments/errors.js"

export const coursesRouter = Router()

// GET /api/courses — list published courses
coursesRouter.get("/", async (_req, res) => {
  try {
    const courses = await listCourses()
    res.status(200).json(courses)
  } catch (err) {
    handleError(err, res)
  }
})
