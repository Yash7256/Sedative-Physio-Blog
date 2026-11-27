import { ConflictError } from "./errors.js"

export interface CoursePricingInput {
  id: string
  isFree: boolean
  price: number
}

/**
 * One source of truth for the free/paid rule. Payments and every public read
 * path use this so one misconfigured row cannot render as free in the catalog
 * and fail at checkout.
 */
export function classifyCoursePricing(course: CoursePricingInput): "free" | "paid" {
  if (course.isFree && course.price === 0) return "free"
  if (!course.isFree && course.price > 0) return "paid"

  // Only the id is logged: course titles and prices are catalog data, and a
  // log line should never grow into an unreviewed payload sink.
  console.error(`[course-pricing] Misconfigured pricing for course ${course.id}`)
  throw new ConflictError("Course pricing is misconfigured.")
}
