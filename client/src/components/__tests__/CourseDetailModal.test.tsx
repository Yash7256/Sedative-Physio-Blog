import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ fetchCourseDetail: vi.fn() }))

vi.mock("@/lib/resources", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/resources")>(),
  fetchCourseDetail: mocks.fetchCourseDetail,
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

beforeEach(() => {
  mocks.fetchCourseDetail.mockReset().mockResolvedValue(detail)
})

describe("course detail pricing", () => {
  it("uses the same paise-to-rupee formatting as resource cards", async () => {
    render(<CourseDetailModal open onClose={vi.fn()} slug="priced-course" />)

    await waitFor(() => expect(screen.getAllByText("₹123.45")).toHaveLength(2))
    expect(screen.queryByText("₹123")).toBeNull()
  })
})
