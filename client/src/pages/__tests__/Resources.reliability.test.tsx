import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CartProvider } from "@/lib/cartContext"
import { Resources } from "../Resources"

/**
 * The old Resources page used one Promise.all for notes, models and courses.
 * That made the sections fail together: one bad endpoint hid otherwise healthy
 * content. These tests pin the new promise: each section is independent, and a
 * failed refetch must not erase data that was already loaded.
 */
const hooks = vi.hoisted(() => ({
  useCourseList: vi.fn(),
  useNoteList: vi.fn(),
  useModelList: vi.fn(),
}))

vi.mock("@/lib/resources-queries", () => hooks)

function query<T>(data: T, overrides: Record<string, unknown> = {}) {
  return {
    data,
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
  it("shows notes and models when the course query fails", () => {
    hooks.useCourseList.mockReturnValue(query(undefined, { isError: true, isRefetchError: true }))

    renderResources()

    expect(screen.getByText(/could not load courses/i)).toBeInTheDocument()
    expect(screen.getAllByText("Note One")[0]).toBeInTheDocument()
    expect(screen.getAllByText("Model One")[0]).toBeInTheDocument()
  })

  it("shows courses and models when the note query fails", () => {
    hooks.useNoteList.mockReturnValue(query(undefined, { isError: true, isRefetchError: true }))

    renderResources()

    expect(screen.getByText(/could not load notes/i)).toBeInTheDocument()
    expect(screen.getAllByText("Course One")[0]).toBeInTheDocument()
    expect(screen.getAllByText("Model One")[0]).toBeInTheDocument()
  })

  it("keeps cached course data visible when a refetch fails", () => {
    hooks.useCourseList.mockReturnValue(query(courses, { isError: true, isRefetchError: true }))

    renderResources()

    expect(screen.getAllByText("Course One")[0]).toBeInTheDocument()
    expect(screen.getByText(/could not refresh courses/i)).toBeInTheDocument()
  })

  it("shows a course loading state without hiding other sections", () => {
    hooks.useCourseList.mockReturnValue(query(undefined, { isPending: true }))

    renderResources()

    expect(screen.getByText(/loading courses/i)).toBeInTheDocument()
    expect(screen.getAllByText("Note One")[0]).toBeInTheDocument()
    expect(screen.getAllByText("Model One")[0]).toBeInTheDocument()
  })
})
