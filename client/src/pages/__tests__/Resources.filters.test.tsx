import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CartProvider } from "@/lib/cartContext"
import { Resources } from "../Resources"

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

function filterRegion() {
  return within(screen.getByRole("region", { name: "Resource filters" }))
}

function lastEnabled(mock: ReturnType<typeof vi.fn>): unknown {
  const calls = mock.mock.calls
  return calls[calls.length - 1]?.[0]
}

beforeEach(() => {
  vi.unstubAllEnvs()
  hooks.useCourseList.mockReset().mockReturnValue(query(courses))
  hooks.useNoteList.mockReset().mockReturnValue(query(notes))
  hooks.useModelList.mockReset().mockReturnValue(query(models))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe("resource filter selection", () => {
  it("offers only Courses, Notes and 3D Models — no All filter", () => {
    renderResources()

    expect(filterRegion().getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Courses",
      "3D Models",
      "Notes",
    ])
    expect(filterRegion().queryByRole("button", { name: "All" })).toBeNull()
  })

  it("loads only courses on the first render", () => {
    renderResources()

    expect(lastEnabled(hooks.useCourseList)).toEqual({ enabled: true, filter: "courses" })
    expect(lastEnabled(hooks.useNoteList)).toEqual({ enabled: false, filter: "courses" })
    expect(lastEnabled(hooks.useModelList)).toEqual({ enabled: false, filter: "courses" })
  })

  it("enables only the notes query once the debounce elapses", () => {
    vi.useFakeTimers()
    renderResources()
    fireEvent.click(filterRegion().getByRole("button", { name: "Notes" }))

    act(() => { vi.advanceTimersByTime(200) })

    expect(lastEnabled(hooks.useCourseList)).toEqual({ enabled: false, filter: "notes" })
    expect(lastEnabled(hooks.useNoteList)).toEqual({ enabled: true, filter: "notes" })
    expect(lastEnabled(hooks.useModelList)).toEqual({ enabled: false, filter: "notes" })
  })

  it("does not fetch models in production when 3D Models is selected", () => {
    vi.useFakeTimers()
    vi.stubEnv("PROD", true as never)
    renderResources()
    fireEvent.click(filterRegion().getByRole("button", { name: "3D Models" }))

    act(() => { vi.advanceTimersByTime(200) })

    expect(lastEnabled(hooks.useModelList)).toEqual({ enabled: false, filter: "3d-models" })
    expect(screen.getByText(/coming soon to Sedative Physio/i)).toBeInTheDocument()
  })
})
