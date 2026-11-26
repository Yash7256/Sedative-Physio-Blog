import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter, useLocation } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CartProvider } from "@/lib/cartContext"
import { Resources } from "../Resources"

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

function UrlEcho() {
  const { search } = useLocation()
  return <div data-testid="url">{search}</div>
}

function renderResources(initialEntry = "/resources") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <UrlEcho />
      <CartProvider>
        <Resources />
      </CartProvider>
    </MemoryRouter>,
  )
}

function filterRegion() {
  return within(screen.getByRole("region", { name: "Resource filters" }))
}

function lastEnabled(mock: ReturnType<typeof vi.fn>): unknown {
  const calls = mock.mock.calls
  return calls[calls.length - 1]?.[0]
}

beforeEach(() => {
  hooks.useCourseList.mockReset().mockReturnValue(query(courses))
  hooks.useNoteList.mockReset().mockReturnValue(query(notes))
  hooks.useModelList.mockReset().mockReturnValue(query(models))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("URL-driven resource filters", () => {
  it("defaults to courses and writes ?type=courses to the URL", () => {
    renderResources()

    expect(screen.getByTestId("url").textContent).toBe("?type=courses")
    expect(lastEnabled(hooks.useCourseList)).toEqual({ enabled: true })
    expect(lastEnabled(hooks.useNoteList)).toEqual({ enabled: false })
  })

  it("reads ?type=notes from the URL on first load", () => {
    renderResources("/resources?type=notes")

    expect(lastEnabled(hooks.useNoteList)).toEqual({ enabled: true })
    expect(lastEnabled(hooks.useCourseList)).toEqual({ enabled: false })
    expect(screen.getAllByText("Note One")[0]).toBeInTheDocument()
    expect(screen.queryByText("Course One")).toBeNull()
  })

  it("updates the URL immediately on click but delays the query by ~200ms", () => {
    vi.useFakeTimers()
    renderResources()

    fireEvent.click(filterRegion().getByRole("button", { name: "Notes" }))

    expect(screen.getByTestId("url").textContent).toBe("?type=notes")
    expect(lastEnabled(hooks.useNoteList)).toEqual({ enabled: false })

    act(() => { vi.advanceTimersByTime(199) })
    expect(lastEnabled(hooks.useNoteList)).toEqual({ enabled: false })

    act(() => { vi.advanceTimersByTime(1) })
    expect(lastEnabled(hooks.useNoteList)).toEqual({ enabled: true })
    expect(lastEnabled(hooks.useCourseList)).toEqual({ enabled: false })
  })

  it("ignores a filter that is abandoned before the debounce elapses", () => {
    vi.useFakeTimers()
    renderResources()

    const filters = filterRegion()
    fireEvent.click(filters.getByRole("button", { name: "Notes" }))
    fireEvent.click(filters.getByRole("button", { name: "Courses" }))
    act(() => { vi.advanceTimersByTime(300) })

    expect(lastEnabled(hooks.useCourseList)).toEqual({ enabled: true })
    expect(lastEnabled(hooks.useNoteList)).toEqual({ enabled: false })
  })

  it("shows skeleton cards inside the selected section while it loads", () => {
    hooks.useNoteList.mockReturnValue(query(undefined, { isPending: true }))
    renderResources("/resources?type=notes")

    const notesSection = screen.getByRole("heading", { name: "Notes" }).closest("section")
    expect(screen.getByText(/loading notes/i)).toBeInTheDocument()
    expect(notesSection).not.toBeNull()
    expect(within(notesSection!).getAllByTestId("resource-card-skeleton").length).toBeGreaterThan(0)
    expect(screen.queryByText(/loading courses/i)).toBeNull()
    expect(screen.queryByRole("heading", { name: "Courses" })).toBeNull()
  })
})
