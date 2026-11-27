import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CartProvider } from "@/lib/cartContext"
import { Resources } from "../Resources"

const hooks = vi.hoisted(() => ({
  useCourseList: vi.fn(),
  useNoteList: vi.fn(),
  useModelList: vi.fn(),
  useCourseDetail: () => ({ data: undefined, isPending: false, error: null }),
}))

vi.mock("@/lib/resources-queries", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/resources-queries")>(),
  useCourseList: hooks.useCourseList,
  useNoteList: hooks.useNoteList,
  useModelList: hooks.useModelList,
}))

vi.mock("@/components/CourseDetailModal", () => ({
  CourseDetailModal: ({ open }: { open: boolean }) => open ? <div role="dialog">Course details</div> : null,
}))
vi.mock("@/components/NotePreviewModal", () => ({
  NotePreviewModal: ({ open }: { open: boolean }) => open ? <div role="dialog">Note preview</div> : null,
}))
vi.mock("@/components/ModelViewerModal", () => ({
  ModelViewerModal: ({ open }: { open: boolean }) => open ? <div role="dialog">Model viewer</div> : null,
}))

function query<T>(items: T[] | undefined, overrides: Record<string, unknown> = {}) {
  return {
    data: items === undefined ? undefined : { pages: [{ items, nextCursor: null }], pageParams: [null] },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isError: false,
    isFetching: false,
    isRefetchError: false,
    ...overrides,
  }
}

const courses = [
  {
    id: "c1", title: "Course One", slug: "course-one", shortDescription: "A course", thumbnail: null,
    level: "Beginner", language: "English", estimatedHours: null, price: 0, isFree: true,
  },
  {
    id: "c2", title: "Course Two", slug: "course-two", shortDescription: "Another course", thumbnail: null,
    level: "Advanced", language: "English", estimatedHours: null, price: 12_345, isFree: false,
  },
]

const notes = [{
  id: "n1", title: "Note One", description: "A note", tag: "Anatomy", category: "notes",
  image: null, imageDark: null, fileName: "note-one.pdf", fileSize: 100,
}]

function UrlEcho() {
  return <div data-testid="url">{useLocation().search}</div>
}

function BackButton() {
  const navigate = useNavigate()
  return <button type="button" onClick={() => navigate(-1)}>Go back</button>
}

function renderResources(initialEntry = "/resources", withOuterMain = false) {
  const page = <Resources />
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <UrlEcho />
      <BackButton />
      <CartProvider>{withOuterMain ? <main>{page}</main> : page}</CartProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  document.documentElement.classList.remove("dark")
  hooks.useCourseList.mockReset().mockReturnValue(query(courses))
  hooks.useNoteList.mockReset().mockReturnValue(query(notes))
  hooks.useModelList.mockReset().mockReturnValue(query([]))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  document.documentElement.classList.remove("dark")
})

describe("resource section states", () => {
  it("shows an empty success state instead of hiding a loaded section", () => {
    hooks.useCourseList.mockReturnValue(query([]))

    renderResources()

    expect(screen.getByText("No courses found.")).toBeInTheDocument()
  })

  it("announces a failed Load more request", async () => {
    hooks.useCourseList.mockReturnValue(query(courses, {
      hasNextPage: true,
      fetchNextPage: vi.fn().mockRejectedValue(new Error("offline")),
    }))

    renderResources()
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /load more/i })) })

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load more courses.")
  })

  it("renders six skeletons with an accessible busy/live state on first load", () => {
    hooks.useCourseList.mockReturnValue(query(undefined, { isPending: true }))

    renderResources()

    expect(screen.getAllByTestId("resource-card-skeleton")).toHaveLength(6)
    expect(screen.getByText("Loading courses…")).toHaveAttribute("aria-live", "polite")
    expect(screen.getByTestId("resource-grid")).toHaveAttribute("aria-busy", "true")
  })

  it("shows an immediate skeleton for a newly selected tab", () => {
    vi.useFakeTimers()
    hooks.useNoteList.mockReturnValue(query(undefined, { isPending: true }))

    renderResources()
    fireEvent.click(screen.getByRole("button", { name: "Notes" }))

    const notesSection = screen.getByRole("heading", { name: "Notes" }).closest("section")!
    expect(within(notesSection).getAllByTestId("resource-card-skeleton")).toHaveLength(6)
    expect(screen.queryByText("Course One")).toBeNull()
    expect(screen.getByTestId("resource-grid")).toHaveAttribute("aria-busy", "true")
  })

  it("does not treat a permanently disabled query as loading", () => {
    vi.stubEnv("PROD", true as never)
    hooks.useModelList.mockReturnValue(query(undefined, { isPending: true }))

    renderResources("/resources?type=3d-models")

    expect(screen.queryAllByTestId("resource-card-skeleton")).toHaveLength(0)
    expect(screen.queryByText(/loading models/i)).toBeNull()
  })

  it("does not offer a download button on note cards", () => {
    renderResources("/resources?type=notes")

    expect(screen.getByRole("heading", { name: "Note One" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Download Note One" })).toBeNull()
  })
})

describe("resource page accessibility and navigation", () => {
  it("does not add a second main landmark", () => {
    renderResources("/resources", true)

    expect(screen.getAllByRole("main")).toHaveLength(1)
  })

  it("gives each View Details button a unique accessible name", () => {
    renderResources()

    expect(screen.getAllByRole("button", { name: /view details/i }).map((button) => button.getAttribute("aria-label"))).toEqual([
      "View details for Course One",
      "View details for Course Two",
    ])
  })

  it("does not render the dead development AI button", () => {
    renderResources()

    expect(screen.queryByRole("button", { name: /unlock ai assistant/i })).toBeNull()
    expect(screen.getAllByText("Coming Soon").length).toBeGreaterThan(0)
  })

  it("scrolls back to the top when the filter changes", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {})
    renderResources()

    fireEvent.click(screen.getByRole("button", { name: "Notes" }))

    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it("replaces the URL for a filter click that is quickly reversed", () => {
    vi.useFakeTimers()
    renderResources()
    const filters = within(screen.getByRole("region", { name: "Resource filters" }))

    fireEvent.click(filters.getByRole("button", { name: "Notes" }))
    fireEvent.click(filters.getByRole("button", { name: "Courses" }))
    act(() => { vi.advanceTimersByTime(200) })
    fireEvent.click(screen.getByRole("button", { name: "Go back" }))

    expect(screen.getByTestId("url").textContent).toBe("?type=courses")
  })

  it("stores an opened preview in the URL and closes it on browser Back", () => {
    renderResources()

    fireEvent.click(screen.getByRole("button", { name: "View details for Course One" }))

    expect(decodeURIComponent(screen.getByTestId("url").textContent ?? "")).toContain("preview=course:course-one")
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Go back" }))

    expect(screen.getByTestId("url").textContent).not.toContain("preview=")
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
