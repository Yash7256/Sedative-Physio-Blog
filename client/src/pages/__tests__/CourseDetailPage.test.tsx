import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { CourseDetail } from "@/lib/resources"

const { mockUseCourseDetail } = vi.hoisted(() => ({ mockUseCourseDetail: vi.fn() }))

vi.mock("@/lib/resources-queries", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/resources-queries")>(),
  useCourseDetail: mockUseCourseDetail,
}))

import { CourseDetailPage } from "../CourseDetailPage"

const detail: CourseDetail = {
  id: "c1",
  title: "Clinical Reasoning",
  slug: "clinical-reasoning",
  shortDescription: "Learn a repeatable assessment workflow.",
  thumbnail: "/courses/clinical-reasoning.png",
  level: "Beginner",
  language: "English",
  estimatedHours: 8,
  price: 49900,
  isFree: false,
  highlights: ["History", "Examination"],
  sections: [{
    id: "s1",
    title: "Foundations",
    description: null,
    order: 1,
    lessons: [{
      id: "l1",
      title: "First visit",
      slug: "first-visit",
      type: "UNKNOWN" as CourseDetail["sections"][number]["lessons"][number]["type"],
      duration: 12,
      isPreview: true,
    }],
  }],
  tutor: {
    id: "t1",
    name: "Dr. Tutor",
    designation: "Physiotherapist",
    image: "https://evil.example/tracker.png",
    bio: "Teaches clinical reasoning.",
  },
}

afterEach(() => {
  mockUseCourseDetail.mockReset()
  for (const node of document.querySelectorAll("[data-course-seo]")) node.remove()
})

describe("CourseDetailPage", () => {
  it("requests the shared detail query and renders a safe syllabus", () => {
    mockUseCourseDetail.mockReturnValue({ data: detail, isPending: false, error: null })

    render(<CourseDetailPage slug="clinical-reasoning" />)

    expect(mockUseCourseDetail).toHaveBeenCalledWith("clinical-reasoning", true)
    expect(screen.getAllByText("Clinical Reasoning").length).toBeGreaterThan(0)
    expect(screen.getByText("₹499")).toBeInTheDocument()
    expect(screen.getByText("First visit")).toBeInTheDocument()
    expect(screen.getByText("Lesson")).toBeInTheDocument()
    expect(screen.getByAltText("Clinical Reasoning")).toHaveAttribute("src", "/courses/clinical-reasoning.png")
    expect(screen.queryByAltText("Dr. Tutor")).not.toBeInTheDocument()
  })

  it("shows a bounded error instead of crashing", () => {
    mockUseCourseDetail.mockReturnValue({ data: undefined, isPending: false, error: new Error("Bad response") })

    render(<CourseDetailPage slug="broken-course" />)

    expect(screen.getByText("Bad response")).toBeInTheDocument()
  })

  it("shows a loading state while the query is pending", () => {
    mockUseCourseDetail.mockReturnValue({ data: undefined, isPending: true, error: null })

    render(<CourseDetailPage slug="loading-course" />)

    expect(screen.getByText(/loading course/i)).toBeInTheDocument()
  })
})
