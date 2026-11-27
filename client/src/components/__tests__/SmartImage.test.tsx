import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SmartImage } from "../SmartImage"
import { ThemeImage } from "../ThemeImage"

beforeEach(() => {
  document.documentElement.classList.remove("dark")
})

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.classList.remove("dark")
})

describe("SmartImage WebP fallback", () => {
  it("drops the WebP source and falls back to the original raster when the WebP file fails", () => {
    const { container } = render(<SmartImage src="/photo.png" alt="Photo" />)

    expect(container.querySelector("source")).toHaveAttribute("srcset", "/photo.webp")
    fireEvent.error(screen.getByAltText("Photo"))

    expect(container.querySelector("source")).toBeNull()
    expect(screen.getByAltText("Photo")).toHaveAttribute("src", "/photo.png")
  })

  it("does not loop when the original raster also fails", () => {
    render(<SmartImage src="/photo.png" alt="Photo" />)

    fireEvent.error(screen.getByAltText("Photo"))
    fireEvent.error(screen.getByAltText("Photo"))

    expect(screen.getByAltText("Photo")).toHaveAttribute("src", "/photo.png")
  })
})

describe("ThemeImage", () => {
  it("renders one image and switches between light and dark sources", async () => {
    render(<ThemeImage src="/light.png" darkSrc="/dark.png" alt="Card" />)

    expect(screen.getAllByRole("img")).toHaveLength(1)
    expect(screen.getByAltText("Card")).toHaveAttribute("src", "/light.png")

    document.documentElement.classList.add("dark")

    await waitFor(() => expect(screen.getByAltText("Card")).toHaveAttribute("src", "/dark.png"))
    expect(screen.getAllByRole("img")).toHaveLength(1)
  })

  it("uses the light source when no dark variant is supplied", () => {
    document.documentElement.classList.add("dark")
    render(<ThemeImage src="/light.png" alt="Card" />)

    expect(screen.getByAltText("Card")).toHaveAttribute("src", "/light.png")
  })
})
