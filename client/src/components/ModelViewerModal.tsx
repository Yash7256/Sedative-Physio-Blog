import { useCallback, useEffect, useRef, useState } from "react"
import { Dialog } from "radix-ui"
import { X, Box, Maximize, Minimize, RefreshCw, Scan, MousePointer2 } from "lucide-react"
import * as OV from "online-3d-viewer"
import { getAnatomyInfo, enrichAnatomy, type AnatomyInfo } from "../lib/anatomy"

interface ModelViewerModalProps {
  open: boolean
  onClose: () => void
  modelUrl: string | null
  modelName: string
}

interface PosedStruct extends AnatomyInfo {
  key: string
}

const FOCUS_RGB: [number, number, number] = [0, 137, 123]
const HOVER_RGB: [number, number, number] = [255, 176, 0]

interface MeshUserData {
  originalMeshInstance?: { GetName?: () => string }
}

type MouseCoords = { x: number; y: number }

interface TypedViewer {
  GetCamera: () => OV.Camera
  SetCamera: (camera: OV.Camera) => void
  SetMouseMoveHandler: (handler: (coords: MouseCoords) => void) => void
  SetMouseClickHandler: (handler: (button: number, coords: MouseCoords) => void) => void
  GetMeshUserDataUnderMouse: (mode: number, coords: MouseCoords) => MeshUserData | null
  SetMeshesHighlight: (color: OV.RGBColor, test: (ud: MeshUserData) => boolean) => void
  GetBoundingSphere: (test: (ud: MeshUserData) => boolean) => unknown
  FitSphereToWindow: (sphere: unknown, animate: boolean) => void
  Render: () => void
  Resize: (w?: number, h?: number) => void
}

export function ModelViewerModal({ open, onClose, modelUrl, modelName }: ModelViewerModalProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const fullscreenRef = useRef<HTMLDivElement>(null)

  const viewerRef = useRef<OV.EmbeddedViewer | null>(null)
  const initCamRef = useRef<OV.Camera | null>(null)
  const loadedRef = useRef(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selected, setSelected] = useState<PosedStruct | null>(null)
  const [hovered, setHovered] = useState<PosedStruct | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)

  const selectedRef = useRef<PosedStruct | null>(null)
  selectedRef.current = selected

  const buildStruct = useCallback((rawName: string): PosedStruct => {
    const base = getAnatomyInfo(rawName)
    return { ...base, ...enrichAnatomy(base.baseName), key: rawName }
  }, [])

  /* ── Destroy viewer when dialog closes, so the next open re-initializes ── */
  useEffect(() => {
    if (open) return
    if (viewerRef.current) {
      viewerRef.current.Destroy()
      viewerRef.current = null
    }
    initCamRef.current = null
    loadedRef.current = false
  }, [open])

  /* ── Destroy viewer on unmount ── */
  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        viewerRef.current.Destroy()
        viewerRef.current = null
      }
      initCamRef.current = null
      loadedRef.current = false
    }
  }, [])

  /* ── Initialise + load model once the mount has real dimensions ── */
  useEffect(() => {
    if (!open || !modelUrl || loadedRef.current) return

    const mount = mountRef.current
    if (!mount) return

    /* Nuke any leftover DOM from a previous viewer */
    while (mount.firstChild) mount.removeChild(mount.firstChild)
    setError(null)
    setSelected(null)
    setHovered(null)
    setHoverPos(null)

    let cancelled = false
    setLoading(true)

    const init = () => {
      if (cancelled) return

      let viewer: OV.EmbeddedViewer | null = null
      try {
        viewer = OV.Init3DViewerFromUrlList(mount, [modelUrl], {
          backgroundColor: new OV.RGBAColor(233, 235, 233, 255),
          camera: new OV.Camera(
            new OV.Coord3D(0, 2, 5),
            new OV.Coord3D(0, 0, 0),
            new OV.Coord3D(0, 1, 0),
            45,
          ),
          projectionMode: OV.ProjectionMode.Perspective,
          onModelLoaded: () => {
            if (cancelled || !viewer) return
            const view = viewer.GetViewer() as unknown as TypedViewer
            initCamRef.current = view.GetCamera()

            view.SetMouseMoveHandler((coords) => {
              if (cancelled) return
              const ud = view.GetMeshUserDataUnderMouse(1, coords)
              const rawName = ud?.originalMeshInstance?.GetName?.()
              if (typeof rawName === "string") {
                setHovered(buildStruct(rawName))
                setHoverPos({ x: coords.x, y: coords.y })
              } else {
                setHovered(null)
                setHoverPos(null)
              }
            })

            view.SetMouseClickHandler((button, coords) => {
              if (cancelled) return
              if (button !== 0) return
              const ud = view.GetMeshUserDataUnderMouse(1, coords)
              const rawName = ud?.originalMeshInstance?.GetName?.()
              setSelected(typeof rawName === "string" ? buildStruct(rawName) : null)
            })

            setLoading(false)
            loadedRef.current = true
          },
          onModelLoadFailed: () => {
            if (!cancelled) {
              setError("Could not load the 3D model. Please try again.")
              setLoading(false)
            }
          },
        })
      } catch {
        if (!cancelled) {
          setError("Could not initialize the 3D viewer. Please try again.")
          setLoading(false)
        }
      }

      viewerRef.current = viewer
    }

    /* Initialise once Radix Dialog layout settles and the mount has real dimensions.
       Keep a ResizeObserver running to keep the canvas sized correctly on any
       dialog/fullscreen/window size changes. */
    let ro: ResizeObserver | null = null
    const tryInit = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (w > 0 && h > 0) {
        init()
        ro?.disconnect()
        ro = null
      } else {
        viewerRef.current?.Resize?.()
      }
    }

    ro = new ResizeObserver(tryInit)
    ro.observe(mount)

    /* Fallback sweep in case the mount is already sized but the observer
       fires only on changes and misses the initial state. */
    tryInit()

    return () => {
      cancelled = true
      ro?.disconnect()
    }
  }, [open, modelUrl, buildStruct])

  /* ── Keep the viewer sized on any container change ── */
  useEffect(() => {
    if (!open || !loadedRef.current) return
    const mount = mountRef.current
    if (!mount) return
    const ro = new ResizeObserver(() => {
      viewerRef.current?.Resize?.()
    })
    ro.observe(mount)
    return () => ro.disconnect()
  }, [open])

  /* ── Highlight selection (teal) + hover (amber) ── */
  useEffect(() => {
    const wrapped = viewerRef.current?.GetViewer()
    if (!wrapped) return
    const view = wrapped as unknown as TypedViewer
    const focusName = selected?.rawName ?? null
    const hoverName = hovered?.rawName ?? null
    const effectiveHover = hoverName && hoverName !== focusName ? hoverName : null

    view.SetMeshesHighlight(
      new OV.RGBColor(...FOCUS_RGB),
      (ud) => {
        const n = ud.originalMeshInstance?.GetName?.()
        return typeof n === "string" && n === focusName
      },
    )
    if (effectiveHover) {
      view.SetMeshesHighlight(
        new OV.RGBColor(...HOVER_RGB),
        (ud) => {
          const n = ud.originalMeshInstance?.GetName?.()
          return typeof n === "string" && n === effectiveHover
        },
      )
    }
  }, [selected, hovered])

  /* ── Controls ── */
  const resetView = () => {
    const v = viewerRef.current?.GetViewer() as unknown as TypedViewer | undefined
    if (v && initCamRef.current) v.SetCamera(initCamRef.current)
  }

  const fitView = () => {
    const v = viewerRef.current?.GetViewer() as unknown as TypedViewer | undefined
    if (!v) return
    const sphere = v.GetBoundingSphere(() => true)
    if (sphere) v.FitSphereToWindow(sphere, false)
  }

  const toggleFullscreen = () => {
    const el = fullscreenRef.current
    if (!el) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void el.requestFullscreen().catch(() => {})
    }
  }

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  const info = selected ?? hovered

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-2 z-[61] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-x-8 sm:inset-y-6 lg:inset-x-16 lg:inset-y-8">
          <div ref={fullscreenRef} className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white">
            {/* Toolbar */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/5 px-4 py-2.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <Box className="size-4 shrink-0 text-[#00897b]" />
                <Dialog.Title className="truncate text-sm font-semibold text-[#0b0b0c]">{modelName}</Dialog.Title>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" onClick={() => setSelected(null)} disabled={!selected}
                  className="grid size-8 place-items-center rounded-full border border-black/10 text-[#686a6b] transition-colors hover:border-black/20 hover:text-[#0b0b0c] disabled:cursor-not-allowed disabled:opacity-40"
                  title="Clear selection" aria-label="Clear selection">
                  <MousePointer2 className="size-4" />
                </button>
                <button type="button" onClick={fitView}
                  className="grid size-8 place-items-center rounded-full border border-black/10 text-[#686a6b] transition-colors hover:border-black/20 hover:text-[#0b0b0c]"
                  title="Fit model to screen" aria-label="Fit model to screen">
                  <Scan className="size-4" />
                </button>
                <button type="button" onClick={resetView}
                  className="grid size-8 place-items-center rounded-full border border-black/10 text-[#686a6b] transition-colors hover:border-black/20 hover:text-[#0b0b0c]"
                  title="Reset camera" aria-label="Reset camera">
                  <RefreshCw className="size-4" />
                </button>
                <button type="button" onClick={toggleFullscreen}
                  className="grid size-8 place-items-center rounded-full border border-black/10 text-[#686a6b] transition-colors hover:border-black/20 hover:text-[#0b0b0c]"
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                  {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
                </button>
                <Dialog.Close asChild>
                  <button type="button" aria-label="Close viewer"
                    className="grid size-8 place-items-center rounded-full border border-black/10 text-[#686a6b] transition-colors hover:border-black/20 hover:text-[#0b0b0c]">
                    <X className="size-4" />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* Viewer */}
            <div className="relative min-h-0 flex-1 bg-[#e9ebe9]">
              <div ref={mountRef} className="absolute inset-0 overflow-hidden" />
              {modelUrl && loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="size-8 animate-spin rounded-full border-2 border-[#00897b] border-t-transparent" />
                    <p className="text-sm font-medium text-[#59605d]">Loading 3D model...</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <p className="px-6 text-center text-sm text-[#c0392b]">{error}</p>
                </div>
              )}
              {modelUrl && !loading && !error && (
                <span className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white/90">
                  Drag to rotate · Scroll to zoom · Right-drag to pan · Click a structure
                </span>
              )}
              {hovered && hoverPos && !selected && (
                <div
                  className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg bg-[#0b0b0c] px-3 py-1.5 text-xs font-medium text-[#ececec] shadow-lg"
                  style={{ left: hoverPos.x, top: hoverPos.y }}
                >
                  {hovered.displayName}
                </div>
              )}
            </div>

            {/* Info panel */}
            {info && (
              <div className="max-h-44 shrink-0 overflow-y-auto border-t border-black/5 bg-[#fafaf8] px-4 py-3">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold tracking-[-.02em] text-[#0b0b0c]">{info.displayName}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${selected ? "bg-[#00897b]/10 text-[#00897b]" : "bg-[#ffb000]/15 text-[#8a5a00]"}`}>
                    {selected ? "Selected" : "Hover"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-[#686a6b]">{info.rawName}</p>
                <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {info.system && (
                    <div className="flex gap-2 text-xs">
                      <dt className="shrink-0 font-medium text-[#686a6b]">System</dt>
                      <dd className="text-[#0b0b0c]">{info.system}</dd>
                    </div>
                  )}
                  {info.description && (
                    <div className="flex gap-2 text-xs sm:col-span-2">
                      <dt className="shrink-0 font-medium text-[#686a6b]">Description</dt>
                      <dd className="text-[#0b0b0c]">{info.description}</dd>
                    </div>
                  )}
                  {info.function && (
                    <div className="flex gap-2 text-xs">
                      <dt className="shrink-0 font-medium text-[#686a6b]">Function</dt>
                      <dd className="text-[#0b0b0c]">{info.function}</dd>
                    </div>
                  )}
                  {info.additionalInfo && (
                    <div className="flex gap-2 text-xs">
                      <dt className="shrink-0 font-medium text-[#686a6b]">More</dt>
                      <dd className="text-[#0b0b0c]">{info.additionalInfo}</dd>
                    </div>
                  )}
                  {!info.description && !info.function && (
                    <p className="text-xs italic text-[#9a9c9c] sm:col-span-2">
                      Anatomical details will appear here once the anatomy database is connected.
                    </p>
                  )}
                </dl>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
