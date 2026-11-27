import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import { DEFAULT_QUERY_TIMEOUT_MS } from "./queryClient"
import {
  fetchCourseDetail,
  fetchCourses,
  fetchModels,
  fetchNotes,
  type ResourcePage,
  type ResourcePageOptions,
} from "./resources"

/**
 * Public catalogue keys. The active tab and any server-side filter are part of
 * each key, so switching filters can never render another tab's cached pages.
 */
export const resourceKeys = {
  courses: (filter: string | null = null) => ["public", "resources", "courses", { filter }] as const,
  notes: (filter: string | null = null, category: string | null = null) =>
    ["public", "resources", "notes", { filter, category }] as const,
  models: (filter: string | null = null) => ["public", "resources", "models", { filter }] as const,
  courseDetail: (slug: string) => ["public", "resources", "course", "detail", slug] as const,
}

export interface ResourceListOptions {
  /** Only the selected section should hit the network. */
  enabled?: boolean
  /** Active tab; included in the cache key. */
  filter?: string | null
  /** Optional server-side notes category filter; included in the cache key. */
  category?: string | null
}

function useResourcePages<T>(
  queryKey: readonly unknown[],
  fetcher: (options: ResourcePageOptions) => Promise<ResourcePage<T>>,
  { enabled = true }: ResourceListOptions,
) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      fetcher({ cursor: pageParam, signal, timeoutMs: DEFAULT_QUERY_TIMEOUT_MS }),
    initialPageParam: null as string | null,
    // The server returns null once the lookahead row is exhausted. A repeated
    // cursor is a broken page contract: stop instead of looping forever.
    getNextPageParam: (lastPage, _pages, lastPageParam, allPageParams) => {
      const next = lastPage.nextCursor
      if (!next || next === lastPageParam || allPageParams.includes(next)) return undefined
      return next
    },
    enabled,
  })
}

export function useCourseList(options: ResourceListOptions = {}) {
  return useResourcePages(resourceKeys.courses(options.filter ?? null), fetchCourses, options)
}

export function useNoteList(options: ResourceListOptions = {}) {
  return useResourcePages(
    resourceKeys.notes(options.filter ?? null, options.category ?? null),
    (pageOptions) => fetchNotes({ ...pageOptions, category: options.category ?? undefined }),
    options,
  )
}

export function useModelList(options: ResourceListOptions = {}) {
  return useResourcePages(resourceKeys.models(options.filter ?? null), fetchModels, options)
}

/** Shared public course detail cache for the modal, cart and future detail pages. */
export function useCourseDetail(slug: string | null, enabled = true) {
  return useQuery({
    queryKey: resourceKeys.courseDetail(slug ?? ""),
    queryFn: ({ signal }) => fetchCourseDetail(slug!, { signal, timeoutMs: DEFAULT_QUERY_TIMEOUT_MS }),
    enabled: Boolean(slug) && enabled,
  })
}

/** Flatten already-loaded pages for rendering; this never fetches anything. */
export function flattenResourcePages<T>(data: { pages: ResourcePage<T>[] } | undefined): T[] {
  return data?.pages.flatMap((page) => page.items) ?? []
}
