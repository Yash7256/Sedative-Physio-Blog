import { ApiError, apiFetch, apiJson } from "./api"

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

/** Fetch the list of published notes from the backend. */
export async function fetchNotes(): Promise<NoteSummary[]> {
  return apiJson<NoteSummary[]>("/api/notes")
}

/** Request a presigned download URL for a note's R2 file. */
export async function fetchNoteDownload(id: string): Promise<{ fileName: string; url: string }> {
  return apiJson<{ fileName: string; url: string }>(`/api/notes/${id}/download`)
}

/** Trigger a browser download of the note PDF as a same-origin attachment. */
export async function downloadNoteFile(id: string, fallbackName: string): Promise<void> {
  const safeName = fallbackName.trim().endsWith(".pdf") ? fallbackName.trim() : `${fallbackName.trim()}.pdf`
  const res = await apiFetch(`/api/notes/${id}/file?download=1`)
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

/** Fetch the list of uploaded 3D models from the backend. */
export async function fetchModels(): Promise<ModelSummary[]> {
  return apiJson<ModelSummary[]>("/api/models")
}

/** Fetch the list of published courses from the backend. */
export async function fetchCourses(): Promise<CourseSummary[]> {
  return apiJson<CourseSummary[]>("/api/courses")
}

/** Fetch a single course's details (syllabus + tutor) by slug. */
export async function fetchCourseDetail(slug: string): Promise<CourseDetail> {
  try {
    return await apiJson<CourseDetail>(`/api/courses/${encodeURIComponent(slug)}`)
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