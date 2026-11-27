import { afterEach, describe, expect, it, vi } from "vitest"

import { courseCloudinaryImage } from "../cloudinary"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("Cloudinary course image URLs", () => {
  it("builds an optimized URL from the course slug", () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "demo")

    expect(courseCloudinaryImage("anatomy-batch")).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,w_1200,h_675/courses/anatomy-batch",
    )
  })

  it("accepts a configured folder without allowing path injection", () => {
    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "demo")
    vi.stubEnv("VITE_CLOUDINARY_COURSE_FOLDER", "media/courses/preview")

    expect(courseCloudinaryImage("anatomy-batch")).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,w_1200,h_675/media/courses/preview/anatomy-batch",
    )

    vi.stubEnv("VITE_CLOUDINARY_COURSE_FOLDER", "../evil")
    expect(courseCloudinaryImage("anatomy-batch")).toBeNull()
  })

  it("fails closed on a missing cloud name or unsafe slug", () => {
    expect(courseCloudinaryImage("anatomy-batch")).toBeNull()

    vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "demo")
    expect(courseCloudinaryImage("../evil")).toBeNull()
    expect(courseCloudinaryImage("")).toBeNull()
  })
})
