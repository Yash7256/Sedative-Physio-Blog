import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { CartProvider } from "@/lib/cartContext"
import { Resources } from "../Resources"

const loads = vi.hoisted(() => ({ note: 0, model: 0 }))
const hooks = vi.hoisted(() => ({
  useCourseList: vi.fn(),
  useNoteList: vi.fn(),
  useModelList: vi.fn(),
}))

vi.mock("@/lib/resources-queries", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/resources-queries")>(),
  useCourseList: hooks.useCourseList,
  useNoteList: hooks.useNoteList,
  useModelList: hooks.useModelList,
}))
vi.mock("@/components/CourseDetailModal", () => ({ CourseDetailModal: () => null }))
vi.mock("@/components/NotePreviewModal", () => {
  loads.note += 1
  return { NotePreviewModal: ({ open }: { open: boolean }) => open ? <div role="dialog">Note preview</div> : null }
})
vi.mock("@/components/ModelViewerModal", () => {
  loads.model += 1
  return { ModelViewerModal: ({ open }: { open: boolean }) => open ? <div role="dialog">Model viewer</div> : null }
})
vi.mock("@/lib/analytics", () => ({ trackResourceFlow: vi.fn() }))

function query<T>(items: T[]) {
  return {
    data: { pages: [{ items, nextCursor: null }], pageParams: [null] },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isError: false,
    isFetching: false,
    isRefetchError: false,
  }
}

function renderResources(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <CartProvider><Resources /></CartProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  hooks.useCourseList.mockReset().mockReturnValue(query([
    { id: "c1", title: "Course One", slug: "course-one", shortDescription: "A course", thumbnail: null, level: "Beginner", language: "English", estimatedHours: null, price: 0, isFree: true },
  ]))
  hooks.useNoteList.mockReset().mockReturnValue(query([
    { id: "n1", title: "Note One", description: "A note", tag: "Anatomy", category: "notes", image: null, imageDark: null, fileName: "note-one.pdf", fileSize: 100 },
  ]))
  hooks.useModelList.mockReset().mockReturnValue(query([]))
})

describe("Resources modal code splitting", () => {
  it("does not load note or model modal code for a courses-only page", () => {
    renderResources("/resources")

    expect(loads.note).toBe(0)
    expect(loads.model).toBe(0)
  })

  it("loads only the note modal when a note preview is open", async () => {
    renderResources("/resources?type=notes&preview=note:n1&previewTitle=Note%20One")

    expect(await screen.findByRole("dialog")).toHaveTextContent("Note preview")
    expect(loads.note).toBeGreaterThan(0)
    expect(loads.model).toBe(0)
  })
})
