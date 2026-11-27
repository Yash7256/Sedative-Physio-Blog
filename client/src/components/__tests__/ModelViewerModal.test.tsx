import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const viewerMock = vi.hoisted(() => ({ init: vi.fn() }))

vi.mock("online-3d-viewer", () => ({
  Init3DViewerFromUrlList: viewerMock.init,
  RGBAColor: class {},
  RGBColor: class {},
  Camera: class {},
  Coord3D: class {},
  ProjectionMode: { Perspective: 0 },
}))

import { ModelViewerModal } from "../ModelViewerModal"

beforeEach(() => {
  viewerMock.init.mockReset()
})

describe("3D viewer URL validation", () => {
  it.each(["javascript:alert(1)", "data:text/html,hi", "file:///etc/passwd", "not a url"])(
    "refuses to open the viewer for an unsafe model URL %s",
    (url) => {
      render(<ModelViewerModal open onClose={vi.fn()} modelUrl={url} modelName="Unsafe" />)

      expect(viewerMock.init).not.toHaveBeenCalled()
      expect(screen.getByText(/invalid 3d model url/i)).toBeInTheDocument()
    },
  )
})
