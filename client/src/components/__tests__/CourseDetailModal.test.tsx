import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ useCourseDetail: vi.fn() }))

vi.mock("@/lib/resources-queries", () => ({ useCourseDetail: mocks.useCourseDetail }))

vi.mock("@/components/SmartImage", () => ({
  SmartImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

import { CourseDetailModal } from "../CourseDetailModal"

const detail = {
  id: "c1",
  title: "Priced Course",
  slug: "priced-course",
  shortDescription: "Details",
  thumbnail: null,
  level: "Beginner",
  language: "English",
  estimatedHours: null,
  price: 12_345,
  isFree: false,
  highlights: [],
  sections: [],
  tutor: null,
}

function state(overrides: Record<string, unknown> = {}) {
  return { data: detail, isPending: false, error: null, ...overrides }
}

beforeEach(() => {
  mocks.useCourseDetail.mockReset().mockReturnValue(state())
})

describe("course detail pricing", () => {
  it("uses the same paise-to-rupee formatting as resource cards", async () => {
    render(<CourseDetailModal open onClose={vi.fn()} slug="priced-course" />)

    await waitFor(() => expect(screen.getAllByText("₹123.45")).toHaveLength(2))
    expect(screen.queryByText("₹123")).toBeNull()
  })

  it("shows a consistent free label for a free course", async () => {
    mocks.useCourseDetail.mockReturnValue(state({ data: { ...detail, isFree: true, price: 0 } }))

    render(<CourseDetailModal open onClose={vi.fn()} slug="free-course" />)

    await waitFor(() => expect(screen.getAllByText("Free")).toHaveLength(2))
    expect(screen.queryByText(/₹/)).toBeNull()
  })
})

describe("course detail rendering safety", () => {
  it("falls back when the API returns an unknown lesson type", async () => {
    const lesson = {
      id: "l1",
      title: "New lesson type",
      slug: "new-lesson",
      type: "LIVE",
      duration: null,
      isPreview: false,
    }
    mocks.useCourseDetail.mockReturnValue(state({
      data: {
        ...detail,
        sections: [{ id: "s1", title: "Section", description: null, order: 0, lessons: [lesson] }],
      },
    }))

    render(<CourseDetailModal open onClose={vi.fn()} slug="priced-course" />)

    expect(await screen.findByText("New lesson type")).toBeInTheDocument()
  })

  it("renders a safe error for a malformed detail response", async () => {
    mocks.useCourseDetail.mockReturnValue(state({
      data: undefined,
      error: new Error("Unexpected course response"),
    }))

    render(<CourseDetailModal open onClose={vi.fn()} slug="priced-course" />)

    expect(await screen.findByText("Unexpected course response")).toBeInTheDocument()
  })

  it("does not render external or protocol-relative course images", async () => {
    mocks.useCourseDetail.mockReturnValue(state({
      data: {
        ...detail,
        thumbnail: "https://tracker.example/pixel.png",
        tutor: { id: "t1", name: "Tutor", designation: null, image: "//tracker.example/avatar.png", bio: null },
      },
    }))

    const { container } = render(<CourseDetailModal open onClose={vi.fn()} slug="priced-course" />)

    expect((await screen.findAllByText("Priced Course")).length).toBeGreaterThan(0)
    expect(container.querySelector('img[src="https://tracker.example/pixel.png"]')).toBeNull()
    expect(container.querySelector('img[src="//tracker.example/avatar.png"]')).toBeNull()
  })

  it("does not request detail data while closed", () => {
    render(<CourseDetailModal open={false} onClose={vi.fn()} slug={null} />)

    expect(mocks.useCourseDetail).toHaveBeenCalledWith(null, false)
  })
})
