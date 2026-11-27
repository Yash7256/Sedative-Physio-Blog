import { trackResourceFlow, statusBucketFromError } from "./analytics"
import { ApiError, apiJson, type ApiFetchInit } from "./api"
import { DEFAULT_QUERY_TIMEOUT_MS } from "./queryClient"

export type ResourceCategory = "notes" | "3d-models" | "courses" | "journals"

export interface Resource {
  id: string
  title: string
  description: string
  category: ResourceCategory
  tag: string
  image: string
  imageDark?: string
  slug?: string
}

export interface NoteSummary {
  id: string
  title: string
  description: string | null
  tag: string | null
  category: string
  image: string | null
  imageDark: string | null
  fileName: string | null
  fileSize: number | null
}

export interface CourseSummary {
  id: string
  title: string
  slug: string
  shortDescription: string | null
  thumbnail: string | null
  level: string
  language: string
  estimatedHours: number | null
  price: number
  isFree: boolean
}

export type LessonType = "VIDEO" | "ARTICLE" | "QUIZ" | "PROJECT"

export interface CourseLesson {
  id: string
  title: string
  slug: string
  type: LessonType
  duration: number | null
  isPreview: boolean
}

export interface CourseSection {
  id: string
  title: string
  description: string | null
  order: number
  lessons: CourseLesson[]
}

export interface CourseTutor {
  id: string
  name: string
  designation: string | null
  image: string | null
  bio: string | null
}

export interface CourseDetail extends CourseSummary {
  highlights: string[]
  sections: CourseSection[]
  tutor: CourseTutor | null
}

export const categoryMeta: Record<ResourceCategory, { label: string; color: string; bg: string }> = {
  notes: { label: "Notes", color: "#6c5ce7", bg: "#ede9fc" },
  "3d-models": { label: "3D Models", color: "#00897b", bg: "#d4f5f0" },
  courses: { label: "Courses", color: "#d35400", bg: "#fce4d6" },
  journals: { label: "Journals", color: "#c0392b", bg: "#fde2e0" },
}

export interface ModelSummary {
  id: string
  name: string
  fileName: string
  fileSize: number
  jsDelivrUrl: string
  createdAt: string
}

export const categories: { key: ResourceCategory | "all"; label: string }[] = [
  { key: "all", label: "All Resources" },
  { key: "notes", label: "Notes" },
  { key: "3d-models", label: "3D Models" },
  { key: "courses", label: "Courses" },
  { key: "journals", label: "Journals" },
]

/** Signal and timeout options accepted by the public resource fetchers. */
export type ResourceFetchOptions = Pick<ApiFetchInit, "signal" | "timeoutMs">

/** One cursor-paginated response. `nextCursor` is null on the final page. */
export interface ResourcePage<T> {
  items: T[]
  nextCursor: string | null
}

/** Pagination and filter inputs, kept separate from the underlying fetch options. */
export interface ResourcePageOptions extends ResourceFetchOptions {
  cursor?: string | null
  limit?: number
  category?: string
}

/** Format a price stored in paise exactly like the resource cards do. */
export function formatCoursePrice(paise: number | undefined): string {
  if (!paise) return "Free"
  const rupees = paise / 100
  return `₹${rupees.toFixed(Number.isInteger(rupees) ? 0 : 2)}`
}

/** One label for every free/paid surface, so badges and rows cannot disagree. */
export function coursePricingLabel(course: Pick<CourseSummary, "isFree" | "price">): string {
  return course.isFree ? "Free" : formatCoursePrice(course.price)
}

/** Catalog images must be same-origin; never turn a DB string into a tracker. */
export function isSafeCatalogImageUrl(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false
  if (/^\/(?!\/|\\).*/.test(value)) return true
  try {
    const url = new URL(value)
    return (url.protocol === "http:" || url.protocol === "https:") &&
      !!globalThis.location && url.origin === globalThis.location.origin
  } catch {
    return false
  }
}

/** Keep the opaque cursor in the query string; never pass it through as a fetch option. */
function pagePath(path: string, { cursor, limit, category }: Omit<ResourcePageOptions, keyof ResourceFetchOptions>): string {
  const params = new URLSearchParams()
  if (category) params.set("category", category)
  if (cursor) params.set("cursor", cursor)
  if (limit !== undefined) params.set("limit", String(limit))
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

function assertResourcePage<T>(body: unknown): ResourcePage<T> {
  const page = body as Partial<ResourcePage<T>> | null
  if (!page || typeof page !== "object" || !Array.isArray(page.items) ||
      !(page.nextCursor === null || typeof page.nextCursor === "string")) {
    throw new ApiError(502, "Unexpected catalog response")
  }
  return page as ResourcePage<T>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string"
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

/**
 * Course detail arrives from a public cache, so a bad shape must become a
 * retryable error before it reaches `.map()` and `.length` in the UI.
 */
export function assertCourseDetail(body: unknown): CourseDetail {
  const detail = body
  if (!isRecord(detail) ||
      typeof detail.id !== "string" || detail.id.length === 0 ||
      typeof detail.title !== "string" ||
      typeof detail.slug !== "string" ||
      !isNullableString(detail.shortDescription) ||
      !isNullableString(detail.thumbnail) ||
      typeof detail.level !== "string" ||
      typeof detail.language !== "string" ||
      !(detail.estimatedHours === null || isNumber(detail.estimatedHours)) ||
      !isNumber(detail.price) || !Number.isSafeInteger(detail.price) || detail.price < 0 ||
      typeof detail.isFree !== "boolean" ||
      !Array.isArray(detail.highlights) || !detail.highlights.every((item) => typeof item === "string") ||
      !Array.isArray(detail.sections) ||
      !(detail.tutor === null || isRecord(detail.tutor))) {
    throw new ApiError(502, "Unexpected course response")
  }

  if ((detail.isFree && detail.price !== 0) || (!detail.isFree && detail.price <= 0)) {
    throw new ApiError(502, "Unexpected course response")
  }

  const tutor = detail.tutor
  if (tutor && (
    typeof tutor.id !== "string" ||
    typeof tutor.name !== "string" ||
    !isNullableString(tutor.designation) ||
    !isNullableString(tutor.image) ||
    !isNullableString(tutor.bio)
  )) {
    throw new ApiError(502, "Unexpected course response")
  }

  for (const section of detail.sections as unknown[]) {
    if (!isRecord(section) ||
        typeof section.id !== "string" ||
        typeof section.title !== "string" ||
        !isNullableString(section.description) ||
        !isNumber(section.order) ||
        !Array.isArray(section.lessons)) {
      throw new ApiError(502, "Unexpected course response")
    }
    for (const lesson of section.lessons as unknown[]) {
      if (!isRecord(lesson) ||
          typeof lesson.id !== "string" ||
          typeof lesson.title !== "string" ||
          typeof lesson.slug !== "string" ||
          typeof lesson.type !== "string" || lesson.type.length === 0 ||
          !(lesson.duration === null || isNumber(lesson.duration)) ||
          typeof lesson.isPreview !== "boolean") {
        throw new ApiError(502, "Unexpected course response")
      }
    }
  }

  return detail as unknown as CourseDetail
}

async function fetchResourcePage<T>(path: string, options: ResourceFetchOptions): Promise<ResourcePage<T>> {
  return assertResourcePage<T>(await apiJson<unknown>(path, options))
}

/** Fetch a page of published notes from the backend. */
export async function fetchNotes({ cursor, limit, category, ...options }: ResourcePageOptions = {}): Promise<ResourcePage<NoteSummary>> {
  return fetchResourcePage<NoteSummary>(pagePath("/api/notes", { cursor, limit, category }), options)
}

/** Fetch a page of uploaded 3D models from the backend. */
export async function fetchModels({ cursor, limit, ...options }: ResourcePageOptions = {}): Promise<ResourcePage<ModelSummary>> {
  return fetchResourcePage<ModelSummary>(pagePath("/api/models", { cursor, limit }), options)
}

export interface CoursePageOptions extends ResourcePageOptions {
  /** Only the browse UI opts into product telemetry; catalog lookups stay silent. */
  telemetry?: boolean
}

/** Fetch a page of published courses from the backend. */
export async function fetchCourses({ cursor, limit, telemetry = false, ...options }: CoursePageOptions = {}): Promise<ResourcePage<CourseSummary>> {
  const path = pagePath("/api/courses", { cursor, limit })
  if (!telemetry) return fetchResourcePage<CourseSummary>(path, options)

  const startedAt = Date.now()
  trackResourceFlow("courses_catalog_requested")
  try {
    const page = await fetchResourcePage<CourseSummary>(path, options)
    trackResourceFlow("courses_catalog_succeeded", {
      count: page.items.length,
      durationMs: Date.now() - startedAt,
    })
    return page
  } catch (err) {
    trackResourceFlow("courses_catalog_failed", {
      durationMs: Date.now() - startedAt,
      statusBucket: statusBucketFromError(err),
    })
    throw err
  }
}

/**
 * Walk cursor pages to build a full catalogue. Only for callers that genuinely
 * need every course (e.g. resolving enrollment ids) — the browse UI paginates.
 */
const MAX_CATALOGUE_PAGES = 100

export async function fetchAllCourses(options: ResourceFetchOptions = {}): Promise<CourseSummary[]> {
  const items: CourseSummary[] = []
  let cursor: string | null = null
  for (let page = 0; page < MAX_CATALOGUE_PAGES; page += 1) {
    const result = await fetchCourses({ ...options, cursor })
    items.push(...result.items)
    if (!result.nextCursor || result.nextCursor === cursor) return items
    cursor = result.nextCursor
  }
  throw new Error("Course catalogue pagination did not terminate")
}

/** Fetch a single course's details (syllabus + tutor) by slug. */
export async function fetchCourseDetail(slug: string, options: ResourceFetchOptions = {}): Promise<CourseDetail> {
  try {
    return assertCourseDetail(await apiJson<unknown>(`/api/courses/${encodeURIComponent(slug)}`, {
      timeoutMs: DEFAULT_QUERY_TIMEOUT_MS,
      ...options,
    }))
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw new Error("Course not found")
    throw err
  }
}

/** Map a NoteSummary to the Resource shape used by the UI, or null if category is not a resource category. */
export function noteToResource(note: NoteSummary): Resource | null {
  if (note.category !== "notes") return null
  return {
    id: note.id,
    title: note.title,
    description: note.description ?? "",
    category: note.category,
    tag: note.tag ?? "Notes",
    image: note.image ?? "",
    imageDark: note.imageDark ?? undefined,
  }
}

/** Map a ModelSummary to the Resource shape used by the UI. */
export function modelToResource(model: ModelSummary): Resource {
  return {
    id: model.id,
    title: model.name,
    description: `${model.fileName} — interactive 3D anatomy model.`,
    category: "3d-models",
    tag: model.fileName.replace(/\.glb$/i, ""),
    image: "",
  }
}

/** Map a CourseSummary to the Resource shape used by the UI. */
export function courseToResource(course: CourseSummary): Resource {
  return {
    id: course.id,
    title: course.title,
    description: course.shortDescription ?? "",
    category: "courses",
    tag: course.level.charAt(0) + course.level.slice(1).toLowerCase(),
    image: isSafeCatalogImageUrl(course.thumbnail) ? course.thumbnail ?? "" : "",
    slug: course.slug,
  }
}

/** Static resources for the categories without a live data source yet. */
export const staticResources: Resource[] = []