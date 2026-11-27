import { ApiError, apiFetch, apiJson, type ApiFetchInit } from "./api"
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

async function fetchResourcePage<T>(path: string, options: ResourceFetchOptions): Promise<ResourcePage<T>> {
  return assertResourcePage<T>(await apiJson<unknown>(path, options))
}

/** Fetch a page of published notes from the backend. */
export async function fetchNotes({ cursor, limit, category, ...options }: ResourcePageOptions = {}): Promise<ResourcePage<NoteSummary>> {
  return fetchResourcePage<NoteSummary>(pagePath("/api/notes", { cursor, limit, category }), options)
}

/** Request a presigned download URL for a note's R2 file. */
export async function fetchNoteDownload(id: string, options: ResourceFetchOptions = {}): Promise<{ fileName: string; url: string }> {
  return apiJson<{ fileName: string; url: string }>(`/api/notes/${encodeURIComponent(id)}/download`, {
    timeoutMs: DEFAULT_QUERY_TIMEOUT_MS,
    ...options,
  })
}

/** Trigger a browser download of the note PDF as a same-origin attachment. */
export async function downloadNoteFile(id: string, fallbackName: string, options: ResourceFetchOptions = {}): Promise<void> {
  const safeName = fallbackName.trim().endsWith(".pdf") ? fallbackName.trim() : `${fallbackName.trim()}.pdf`
  const res = await apiFetch(`/api/notes/${encodeURIComponent(id)}/file?download=1`, {
    timeoutMs: DEFAULT_QUERY_TIMEOUT_MS,
    ...options,
  })
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = objectUrl
  a.download = safeName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}

/** Fetch a page of uploaded 3D models from the backend. */
export async function fetchModels({ cursor, limit, ...options }: ResourcePageOptions = {}): Promise<ResourcePage<ModelSummary>> {
  return fetchResourcePage<ModelSummary>(pagePath("/api/models", { cursor, limit }), options)
}

/** Fetch a page of published courses from the backend. */
export async function fetchCourses({ cursor, limit, ...options }: ResourcePageOptions = {}): Promise<ResourcePage<CourseSummary>> {
  return fetchResourcePage<CourseSummary>(pagePath("/api/courses", { cursor, limit }), options)
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
    return await apiJson<CourseDetail>(`/api/courses/${encodeURIComponent(slug)}`, {
      timeoutMs: DEFAULT_QUERY_TIMEOUT_MS,
      ...options,
    })
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
    image: course.thumbnail ?? "",
    slug: course.slug,
  }
}

/** Static resources for the categories without a live data source yet. */
export const staticResources: Resource[] = []