import { describe, expect, it } from "vitest"

import { courseCloudinaryImage } from "../cloudinary.js"

describe("Cloudinary course image URLs", () => {
  it("builds an optimized URL from the course slug", () => {
    expect(courseCloudinaryImage("anatomy-batch", {
      CLOUDINARY_CLOUD_NAME: "demo",
    })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,w_1200,h_675/courses/anatomy-batch",
    )
  })

  it("accepts a configured folder without allowing path injection", () => {
    expect(courseCloudinaryImage("anatomy-batch", {
      CLOUDINARY_CLOUD_NAME: "demo",
      CLOUDINARY_COURSE_FOLDER: "media/courses/preview",
    })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,w_1200,h_675/media/courses/preview/anatomy-batch",
    )

    expect(courseCloudinaryImage("anatomy-batch", {
      CLOUDINARY_CLOUD_NAME: "demo",
      CLOUDINARY_COURSE_FOLDER: "../evil",
    })).toBeNull()
  })

  it("fails closed on a missing cloud name or unsafe slug", () => {
    expect(courseCloudinaryImage("anatomy-batch", {})).toBeNull()
    expect(courseCloudinaryImage("../evil", { CLOUDINARY_CLOUD_NAME: "demo" })).toBeNull()
    expect(courseCloudinaryImage("", { CLOUDINARY_CLOUD_NAME: "demo" })).toBeNull()
  })
})
