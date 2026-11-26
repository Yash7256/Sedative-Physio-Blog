import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
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

const courses = [{ id: "c1" }]
const notes = [{ id: "n1" }]
const models = [{ id: "m1" }]

let queryClient: QueryClient

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  mocks.fetchCourses.mockReset().mockResolvedValue(courses)
  mocks.fetchNotes.mockReset().mockResolvedValue(notes)
  mocks.fetchModels.mockReset().mockResolvedValue(models)
})

describe("resource queries", () => {
  it("loads courses, notes and models as independent cache entries", async () => {
    const { result } = renderHook(
      () => ({
        courses: useCourseList(),
        notes: useNoteList(),
        models: useModelList(),
      }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.courses.data).toEqual(courses)
      expect(result.current.notes.data).toEqual(notes)
      expect(result.current.models.data).toEqual(models)
    })

    const cachedKeys = queryClient.getQueryCache().getAll().map((query) => query.queryKey)
    expect(cachedKeys).toContainEqual(resourceKeys.courses)
    expect(cachedKeys).toContainEqual(resourceKeys.notes)
    expect(cachedKeys).toContainEqual(resourceKeys.models)
    expect(mocks.fetchCourses).toHaveBeenCalledTimes(1)
    expect(mocks.fetchNotes).toHaveBeenCalledTimes(1)
    expect(mocks.fetchModels).toHaveBeenCalledTimes(1)
  })

  it("passes an AbortSignal into each fetcher", async () => {
    const { result } = renderHook(() => useCourseList(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(courses))

    expect(mocks.fetchCourses).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.anything() }),
    )
  })

  it("does not fetch sections whose filter is not selected", async () => {
    const { result } = renderHook(
      () => ({
        courses: useCourseList(),
        notes: useNoteList({ enabled: false }),
        models: useModelList({ enabled: false }),
      }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.courses.data).toEqual(courses))

    expect(mocks.fetchCourses).toHaveBeenCalledTimes(1)
    expect(mocks.fetchNotes).not.toHaveBeenCalled()
    expect(mocks.fetchModels).not.toHaveBeenCalled()
  })

  it("deduplicates concurrent consumers of the same query", async () => {
    const { result } = renderHook(
      () => ({ first: useCourseList(), second: useCourseList() }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.first.data).toEqual(courses)
      expect(result.current.second.data).toEqual(courses)
    })

    expect(mocks.fetchCourses).toHaveBeenCalledTimes(1)
  })
})
