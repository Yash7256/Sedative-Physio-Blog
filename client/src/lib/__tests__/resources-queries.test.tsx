import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchCourses: vi.fn(),
  fetchNotes: vi.fn(),
  fetchModels: vi.fn(),
  fetchCourseDetail: vi.fn(),
}))

vi.mock("../resources", () => mocks)

import { shouldRetryQuery } from "../queryClient"
import {
  resourceKeys,
  useCourseDetail,
  useCourseList,
  useModelList,
  useNoteList,
} from "../resources-queries"

const firstCourses = { items: [{ id: "c1" }], nextCursor: "cursor-2" }
const lastCourses = { items: [{ id: "c2" }], nextCursor: null }
const notes = { items: [{ id: "n1" }], nextCursor: null }
const models = { items: [{ id: "m1" }], nextCursor: null }
const detail = {
  id: "c1",
  title: "Course",
  slug: "course",
  shortDescription: null,
  thumbnail: null,
  level: "Beginner",
  language: "English",
  estimatedHours: null,
  price: 0,
  isFree: true,
  highlights: [],
  sections: [],
  tutor: null,
}

let queryClient: QueryClient

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  mocks.fetchCourses.mockReset().mockResolvedValue(firstCourses)
  mocks.fetchNotes.mockReset().mockResolvedValue(notes)
  mocks.fetchModels.mockReset().mockResolvedValue(models)
  mocks.fetchCourseDetail.mockReset().mockResolvedValue(detail)
})

describe("resource infinite queries", () => {
  it("loads each section into its own cache entry keyed by the active filter", async () => {
    const { result } = renderHook(
      () => ({
        courses: useCourseList({ filter: "courses" }),
        notes: useNoteList({ filter: "notes", category: "notes" }),
        models: useModelList({ filter: "3d-models" }),
      }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.courses.data?.pages[0]).toEqual(firstCourses)
      expect(result.current.notes.data?.pages[0]).toEqual(notes)
      expect(result.current.models.data?.pages[0]).toEqual(models)
    })

    const cachedKeys = queryClient.getQueryCache().getAll().map((query) => query.queryKey)
    expect(cachedKeys).toContainEqual(resourceKeys.courses("courses"))
    expect(cachedKeys).toContainEqual(resourceKeys.notes("notes", "notes"))
    expect(cachedKeys).toContainEqual(resourceKeys.models("3d-models"))
    expect(mocks.fetchCourses).toHaveBeenCalledTimes(1)
    expect(mocks.fetchNotes).toHaveBeenCalledWith(expect.objectContaining({ category: "notes" }))
  })

  it("keeps a different cache entry per active filter", () => {
    expect(resourceKeys.courses("courses")).not.toEqual(resourceKeys.courses("notes"))
    expect(resourceKeys.notes("courses", "notes")).not.toEqual(resourceKeys.notes("notes", "notes"))
    expect(resourceKeys.models("3d-models")).not.toEqual(resourceKeys.models("notes"))
  })

  it("feeds nextCursor back as the next page's cursor and stops on null", async () => {
    mocks.fetchCourses.mockResolvedValueOnce(firstCourses).mockResolvedValueOnce(lastCourses)
    const { result } = renderHook(() => useCourseList({ filter: "courses" }), { wrapper })

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1))
    expect(result.current.hasNextPage).toBe(true)

    await act(async () => { await result.current.fetchNextPage() })

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(mocks.fetchCourses).toHaveBeenNthCalledWith(2, expect.objectContaining({ cursor: "cursor-2" }))
    expect(result.current.data?.pages.flatMap((p) => p.items)).toEqual([{ id: "c1" }, { id: "c2" }])
    expect(result.current.hasNextPage).toBe(false)
  })

  it("stops paginating when the server repeats a cursor", async () => {
    const repeated = { items: [{ id: "c1" }], nextCursor: "cursor-repeat" }
    mocks.fetchCourses.mockReset().mockResolvedValue(repeated)
    const { result } = renderHook(() => useCourseList({ filter: "courses" }), { wrapper })

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1))
    expect(result.current.hasNextPage).toBe(true)

    await act(async () => { await result.current.fetchNextPage() })

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(result.current.hasNextPage).toBe(false)
    expect(mocks.fetchCourses).toHaveBeenCalledTimes(2)
  })

  it("passes an AbortSignal into each fetcher", async () => {
    const { result } = renderHook(() => useCourseList({ filter: "courses" }), { wrapper })

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(1))

    expect(mocks.fetchCourses).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.anything() }),
    )
  })

  it("does not fetch sections whose filter is not selected", async () => {
    const { result } = renderHook(
      () => ({
        courses: useCourseList({ filter: "courses" }),
        notes: useNoteList({ filter: "courses", enabled: false }),
        models: useModelList({ filter: "courses", enabled: false }),
      }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.courses.data?.pages).toHaveLength(1))

    expect(mocks.fetchCourses).toHaveBeenCalledTimes(1)
    expect(mocks.fetchNotes).not.toHaveBeenCalled()
    expect(mocks.fetchModels).not.toHaveBeenCalled()
  })

  it("deduplicates concurrent consumers of the same query", async () => {
    const { result } = renderHook(
      () => ({
        first: useCourseList({ filter: "courses" }),
        second: useCourseList({ filter: "courses" }),
      }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.first.data?.pages).toHaveLength(1)
      expect(result.current.second.data?.pages).toHaveLength(1)
    })

    expect(mocks.fetchCourses).toHaveBeenCalledTimes(1)
  })
})

describe("course detail query", () => {
  it("caches and deduplicates the same slug across consumers", async () => {
    const { result, unmount } = renderHook(
      () => ({
        first: useCourseDetail("course"),
        second: useCourseDetail("course"),
      }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.first.data).toEqual(detail)
      expect(result.current.second.data).toEqual(detail)
    })
    expect(mocks.fetchCourseDetail).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryCache().getAll().map((query) => query.queryKey))
      .toContainEqual(resourceKeys.courseDetail("course"))

    unmount()
    renderHook(() => useCourseDetail("course"), { wrapper })
    await waitFor(() => expect(mocks.fetchCourseDetail).toHaveBeenCalledTimes(1))
  })

  it("passes an AbortSignal and aborts when the consumer unmounts", async () => {
    let signal: AbortSignal | undefined
    mocks.fetchCourseDetail.mockImplementation((_slug: string, options: { signal?: AbortSignal }) => {
      signal = options.signal
      return new Promise(() => undefined)
    })

    const { unmount } = renderHook(() => useCourseDetail("course"), { wrapper })
    await waitFor(() => expect(signal).toBeDefined())
    unmount()

    expect(signal?.aborted).toBe(true)
  })

  it("does not retry a missing course", async () => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: shouldRetryQuery } } })
    mocks.fetchCourseDetail.mockRejectedValue(new Error("Course not found"))

    const { result } = renderHook(() => useCourseDetail("missing"), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mocks.fetchCourseDetail).toHaveBeenCalledTimes(1)
  })

  it("does not fetch without a slug", () => {
    renderHook(() => useCourseDetail(null), { wrapper })

    expect(mocks.fetchCourseDetail).not.toHaveBeenCalled()
  })
})
