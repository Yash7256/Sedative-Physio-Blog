import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

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

function query<T>(items: T[], overrides: Record<string, unknown> = {}) {
  return {
    data: { pages: [{ items, nextCursor: null }], pageParams: [null] },
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

function renderResources(initialEntry = "/resources") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CartProvider>
        <Resources />
      </CartProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  hooks.useCourseList.mockReset().mockReturnValue(query(courses))
  hooks.useNoteList.mockReset().mockReturnValue(query([]))
  hooks.useModelList.mockReset().mockReturnValue(query([]))
})

describe("resource pagination controls", () => {
  it("shows Load more only when another page exists, and fetches it", () => {
    const courseQuery = query(courses, { hasNextPage: true })
    hooks.useCourseList.mockReturnValue(courseQuery)

    renderResources()

    fireEvent.click(screen.getByRole("button", { name: /load more/i }))
    expect(courseQuery.fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it("hides Load more on the final page", () => {
    renderResources()

    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull()
  })

  it("disables Load more and shows busy text while the next page is loading", () => {
    hooks.useCourseList.mockReturnValue(query(courses, { hasNextPage: true, isFetchingNextPage: true }))

    renderResources()

    const button = screen.getByRole("button", { name: /loading more/i })
    expect(button).toBeDisabled()
    expect(screen.queryByText(/loading courses/i)).toBeNull()
  })

  it("places the control inside the active section and scopes the query key to that tab", () => {
    hooks.useNoteList.mockReturnValue(query([], { hasNextPage: true }))

    renderResources("/resources?type=notes")

    const button = screen.getByRole("button", { name: /load more/i })
    const notesSection = screen.getByRole("heading", { name: "Notes" }).closest("section")
    expect(within(notesSection!).getByRole("button", { name: /load more/i })).toBe(button)
    expect(hooks.useNoteList.mock.calls.at(-1)?.[0]).toEqual({ enabled: true, filter: "notes" })
  })
})
