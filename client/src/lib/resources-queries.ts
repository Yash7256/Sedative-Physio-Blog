import { useQuery } from "@tanstack/react-query"

import { DEFAULT_QUERY_TIMEOUT_MS } from "./queryClient"
import { fetchCourses, fetchModels, fetchNotes } from "./resources"

/**
 * Public catalogue keys. Keeping them stable and separate is what lets one
 * failed section keep its own error state without hiding the healthy ones.
 */
export const resourceKeys = {
  courses: ["public", "resources", "courses"] as const,
  notes: ["public", "resources", "notes"] as const,
  models: ["public", "resources", "models"] as const,
}

export function useCourseList() {
  return useQuery({
    queryKey: resourceKeys.courses,
    queryFn: ({ signal }) => fetchCourses({ signal, timeoutMs: DEFAULT_QUERY_TIMEOUT_MS }),
  })
}

export function useNoteList() {
  return useQuery({
    queryKey: resourceKeys.notes,
    queryFn: ({ signal }) => fetchNotes({ signal, timeoutMs: DEFAULT_QUERY_TIMEOUT_MS }),
  })
}

export function useModelList() {
  return useQuery({
    queryKey: resourceKeys.models,
    queryFn: ({ signal }) => fetchModels({ signal, timeoutMs: DEFAULT_QUERY_TIMEOUT_MS }),
  })
}
