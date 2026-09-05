export type ResourceCategory = "notes" | "3d-models" | "courses" | "journals"

export interface Resource {
  id: string
  title: string
  description: string
  category: ResourceCategory
  tag: string
  image: string
}

export interface NoteSummary {
  id: string
  title: string
  description: string | null
  tag: string | null
  category: string
  image: string | null
  fileName: string
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

const API_BASE = import.meta.env.VITE_API_URL ?? ""

/** Fetch the list of published notes from the backend. */
export async function fetchNotes(): Promise<NoteSummary[]> {
  const res = await fetch(`${API_BASE}/api/notes`)
  if (!res.ok) throw new Error(`Failed to fetch notes: ${res.status}`)
  return (await res.json()) as NoteSummary[]
}

/** Request a presigned download URL for a note's R2 file. */
export async function fetchNoteDownload(id: string): Promise<{ fileName: string; url: string }> {
  const res = await fetch(`${API_BASE}/api/notes/${id}/download`)
  if (!res.ok) throw new Error(`Failed to fetch download URL: ${res.status}`)
  return (await res.json()) as { fileName: string; url: string }
}

/** Fetch the list of uploaded 3D models from the backend. */
export async function fetchModels(): Promise<ModelSummary[]> {
  const res = await fetch(`${API_BASE}/api/models`)
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`)
  return (await res.json()) as ModelSummary[]
}

/** Fetch the list of published courses from the backend. */
export async function fetchCourses(): Promise<CourseSummary[]> {
  const res = await fetch(`${API_BASE}/api/courses`)
  if (!res.ok) throw new Error(`Failed to fetch courses: ${res.status}`)
  return (await res.json()) as CourseSummary[]
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
  }
}

/** Static resources for the categories without a live data source yet. */
export const staticResources: Resource[] = []