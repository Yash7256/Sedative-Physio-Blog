import { apiJson } from "./api"
import { fetchCourses, type CourseSummary } from "./resources"

/**
 * The caller's own order history, as `GET /api/payments/my-orders` returns it.
 *
 * `amount` is in paise, matching the column and Razorpay. Dividing by 100 is a
 * display concern and happens in `formatMoney`, so no caller has to remember.
 */
export interface UserOrder {
  id: string
  amount: number
  currency: string
  status: "PENDING" | "PAID" | "FAILED"
  courseIds: string[]
  /** ISO 8601; the server serialises the Date so the client never gets a raw one. */
  createdAt: string
}

/** A course the user is enrolled in, with the detail the API does not return. */
export interface EnrolledCourse {
  courseId: string
  course: CourseSummary
}

export async function fetchMyOrders(): Promise<UserOrder[]> {
  return apiJson<UserOrder[]>("/api/payments/my-orders")
}

/**
 * The caller's enrollments, paired with the course each id refers to.
 *
 * `/my-enrollments` returns bare ids because it has to stay cheap and
 * independent of the catalogue. A course that has since been unpublished is
 * dropped rather than surfaced as a blank row, so what is left is always a
 * course the user can actually open.
 *
 * Sequential on purpose. Fired in parallel with the catalogue lookup it would
 * always download the whole catalogue, including for the common case of an
 * account with no enrollments at all — the largest response on the page, for a
 * list that turns out to be empty. The cost is one extra round trip for users
 * who do have courses.
 */
export async function fetchEnrolledCourses(): Promise<EnrolledCourse[]> {
  const courseIds = await apiJson<string[]>("/api/payments/my-enrollments")
  if (courseIds.length === 0) return []

  const courses = await fetchCourses()
  const byId = new Map(courses.map((c) => [c.id, c]))
  return courseIds.flatMap((courseId) => {
    const course = byId.get(courseId)
    return course ? [{ courseId, course }] : []
  })
}

/** Paise to a rupee string, e.g. `₹499`. */
export function formatMoney(paise: number, currency = "INR"): string {
  const major = paise / 100
  const symbol = currency === "INR" ? "₹" : `${currency} `
  return `${symbol}${major.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

/** e.g. `2 Aug 2026`. Returns an em dash for an unparseable date. */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date)
}
