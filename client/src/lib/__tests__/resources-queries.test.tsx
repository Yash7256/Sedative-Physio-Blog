import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchCourses: vi.fn(),
  fetchNotes: vi.fn(),
  fetchModels: vi.fn(),
}))

vi.mock("../resources", () => mocks)

import {
  resourceKeys,
  useCourseList,
  useModelList,
  useNoteList,
} from "../resources-queries"

const firstCourses = { items: [{ id: "c1" }], nextCursor: "cursor-2" }
const lastCourses = { items: [{ id: "c2" }], nextCursor: null }
const notes = { items: [{ id: "n1" }], nextCursor: null }
const models = { items: [{ id: "m1" }], nextCursor: null }

let queryClient: QueryClient

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  mocks.fetchCourses.mockReset().mockResolvedValue(firstCourses)
  mocks.fetchNotes.mockReset().mockResolvedValue(notes)
  mocks.fetchModels.mockReset().mockResolvedValue(models)
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
