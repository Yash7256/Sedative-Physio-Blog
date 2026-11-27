import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

const cartMock = vi.hoisted(() => ({ isInCart: vi.fn(() => false), addItem: vi.fn() }))

vi.mock("@/lib/cartContext", () => ({
  CartProvider: ({ children }: { children: ReactNode }) => children,
  useCart: () => ({ isInCart: cartMock.isInCart, addItem: cartMock.addItem, items: [] }),
}))

import { LiveCard } from "../Resources"

const card = {
  id: "c1",
  title: "Course One",
  description: "A course",
  category: "courses" as const,
  tag: "Beginner",
  image: "",
  slug: "course-one",
  kind: "course" as const,
  fileName: "",
  fileSize: null,
  isFree: true,
  price: 0,
}

beforeEach(() => {
  cartMock.isInCart.mockClear()
})

describe("resource card rendering", () => {
  it("skips re-rendering when its props are unchanged", () => {
    const onOpen = vi.fn()
    const onDownload = vi.fn()
    const element = (
      <MemoryRouter>
        <LiveCard card={card} downloadingId={null} onOpen={onOpen} onDownload={onDownload} />
      </MemoryRouter>
    )

    const { rerender } = render(element)
    expect(screen.getAllByText("Course One")[0]).toBeInTheDocument()
    expect(cartMock.isInCart).toHaveBeenCalledTimes(1)

    rerender(element)

    expect(cartMock.isInCart).toHaveBeenCalledTimes(1)
  })
})
