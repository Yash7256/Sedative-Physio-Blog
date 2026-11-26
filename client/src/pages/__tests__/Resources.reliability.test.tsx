import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CartProvider } from "@/lib/cartContext"
import { Resources } from "../Resources"

/**
 * The Resources page shows one filter at a time, and a section keeps its own
 * loading/error state. These tests pin the promise that a failed course query
 * cannot prevent the user from switching to healthy notes/models, and that a
 * failed refetch does not erase cached data.
 */
const hooks = vi.hoisted(() => ({
  useCourseList: vi.fn(),
  useNoteList: vi.fn(),
  useModelList: vi.fn(),
}))

vi.mock("@/lib/resources-queries", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/resources-queries")>(),
  ...hooks,
}))

function query<T>(items: T[] | undefined, overrides: Record<string, unknown> = {}) {
  return {
    data: items === undefined ? undefined : { pages: [{ items, nextCursor: null }], pageParams: [null] },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    isPending: false,
    isError: false,
    isFetching: false,
    isRefetchError: false,
    ...overrides,
  }
}

const courses = [{
  id: "c1",
  title: "Course One",
  slug: "course-one",
  shortDescription: "A course",
  thumbnail: null,
  level: "Beginner",
  language: "English",
  estimatedHours: null,
  price: 0,
  isFree: true,
}]

const notes = [{
  id: "n1",
  title: "Note One",
  description: "A note",
  tag: "Anatomy",
  category: "notes",
  image: null,
  imageDark: null,
  fileName: "note-one.pdf",
  fileSize: 100,
}]

const models = [{
  id: "m1",
  name: "Model One",
  fileName: "model-one.glb",
  fileSize: 100,
  jsDelivrUrl: "https://example.com/model-one.glb",
  createdAt: "2026-01-01T00:00:00.000Z",
}]

function renderResources() {
  return render(
    <MemoryRouter>
      <CartProvider>
        <Resources />
      </CartProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  hooks.useCourseList.mockReturnValue(query(courses))
  hooks.useNoteList.mockReturnValue(query(notes))
  hooks.useModelList.mockReturnValue(query(models))
})

describe("independent resource sections", () => {
  it("still shows notes when the course query fails", () => {
    hooks.useCourseList.mockReturnValue(query(undefined, { isError: true, isRefetchError: true }))

    renderResources()

    expect(screen.getByText(/could not load courses/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Notes" }))
    expect(screen.getAllByText("Note One")[0]).toBeInTheDocument()
  })

  it("still shows courses when the note query fails", () => {
    hooks.useNoteList.mockReturnValue(query(undefined, { isError: true, isRefetchError: true }))

    renderResources()

    fireEvent.click(screen.getByRole("button", { name: "Notes" }))
    expect(screen.getByText(/could not load notes/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Courses" }))
    expect(screen.getAllByText("Course One")[0]).toBeInTheDocument()
  })

  it("keeps cached course data visible when a refetch fails", () => {
    hooks.useCourseList.mockReturnValue(query(courses, { isError: true, isRefetchError: true }))

    renderResources()

    expect(screen.getAllByText("Course One")[0]).toBeInTheDocument()
    expect(screen.getByText(/could not refresh courses/i)).toBeInTheDocument()
  })

  it("shows a course loading state and can still switch filters", () => {
    hooks.useCourseList.mockReturnValue(query(undefined, { isPending: true }))

    renderResources()

    expect(screen.getByText(/loading courses/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "3D Models" }))
    expect(screen.getAllByText("Model One")[0]).toBeInTheDocument()
  })
})
