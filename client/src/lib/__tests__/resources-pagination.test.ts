import { beforeEach, describe, expect, it, vi } from "vitest"

const apiMock = vi.hoisted(() => ({
  apiJson: vi.fn(),
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error { status = 0 },
}))

vi.mock("../api", () => apiMock)

import { fetchCourses, fetchModels, fetchNotes } from "../resources"

const page = { items: [{ id: "n1" }], nextCursor: "eyJpZCI6Im4xIn0" }

beforeEach(() => {
  apiMock.apiJson.mockReset().mockResolvedValue(page)
})

describe("paged resource fetchers", () => {
  it("appends cursor, limit and category to notes without leaking them into fetch options", async () => {
    const options = { signal: new AbortController().signal, timeoutMs: 1234 }

    await expect(fetchNotes({ ...options, category: "notes", cursor: "eyJpZCI6Im4xIn0", limit: 5 })).resolves.toBe(page)

    expect(apiMock.apiJson).toHaveBeenCalledWith(
      "/api/notes?category=notes&cursor=eyJpZCI6Im4xIn0&limit=5",
      options,
    )
  })

  it("appends the opaque cursor to courses", async () => {
    await fetchCourses({ cursor: "eyJpZCI6ImMxIn0" })

    expect(apiMock.apiJson).toHaveBeenCalledWith("/api/courses?cursor=eyJpZCI6ImMxIn0", {})
  })

  it("requests an unqualified path when there is no cursor", async () => {
    await fetchModels()

    expect(apiMock.apiJson).toHaveBeenCalledWith("/api/models", {})
  })
})
