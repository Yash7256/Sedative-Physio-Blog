import { useCallback, useEffect, useRef, useState } from "react"
import { Dialog } from "radix-ui"
import { Download, Loader2, Minus, Plus, X } from "lucide-react"
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentLoadingTask,
  type PDFPageProxy,
} from "pdfjs-dist"
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { downloadNoteFile } from "../lib/resources"

GlobalWorkerOptions.workerSrc = workerUrl

const MIN_SCALE = 0.5
const MAX_SCALE = 2.5

interface NotePreviewModalProps {
  open: boolean
  onClose: () => void
  noteId: string | null
  noteTitle: string
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 shrink-0 place-items-center rounded-md text-[#5f6164] transition-colors hover:bg-black/5 hover:text-[#0b0b0c] disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function PdfPage({ page, pageNumber, scale }: { page: PDFPageProxy; pageNumber: number; scale: number }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendered = useRef<number>(-1)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const render = async () => {
      rendered.current = scale
      const viewport = page.getViewport({ scale })
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cssW = Math.round(viewport.width)
      const cssH = Math.round(viewport.height)
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      try {
        await page.render({ canvas, viewport }).promise
      } catch {
        // Ignore render failures (e.g. cancelled while closing)
      }
    }

    if (rendered.current !== scale) void render()

    if (!("IntersectionObserver" in window)) return undefined

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && rendered.current !== scale) void render()
      },
      { rootMargin: "500px 0px" },
    )
    io.observe(wrap)

    return () => {
      io.disconnect()
    }
  }, [page, pageNumber, scale])

  return (
    <div
      ref={wrapRef}
      data-note-page={pageNumber}
      className="mx-auto w-fit overflow-hidden rounded-[3px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2),0_10px_30px_rgba(0,0,0,0.14)]"
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}

export function NotePreviewModal({ open, onClose, noteId, noteTitle }: NotePreviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pages, setPages] = useState<PDFPageProxy[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1)
  const baseWidthRef = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null)

  useEffect(() => {
    if (!open) return undefined
    const root = document.documentElement
    const prevOverflow = root.style.overflow
    root.style.overflow = "hidden"
    return () => {
      root.style.overflow = prevOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open || !noteId) {
      loadingTaskRef.current?.destroy().catch(() => {})
      loadingTaskRef.current = null
      setPages([])
      setError(null)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setPages([])
    setCurrentPage(1)
    setScale(1)
    baseWidthRef.current = null

    const task = getDocument({ url: `/api/notes/${noteId}/file` })
    loadingTaskRef.current = task

    task.promise
      .then(async (doc) => {
        if (cancelled) return
        const first = await doc.getPage(1)
        const viewport = first.getViewport({ scale: 1 })
        baseWidthRef.current = viewport.width
        const pool = await Promise.all(
          Array.from({ length: doc.numPages }, (_, i) => doc.getPage(i + 1)),
        )
        if (cancelled) return
        setPages(pool)
        fitToWidth(viewport.width)
      })
      .catch((err) => {
        console.error("PDF load failed", err)
        if (!cancelled) setError("Could not load the note preview. Please try again.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      loadingTaskRef.current?.destroy().catch(() => {})
      loadingTaskRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, noteId])

  const fitToWidth = (baseWidth = baseWidthRef.current) => {
    if (!baseWidth) return
    const containerW = scrollRef.current?.clientWidth ?? 0
    const next = containerW ? (containerW - 56) / baseWidth : 1
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)))
  }

  const zoomStep = (delta: number) => {
    setScale((prev) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((prev + delta) * 10) / 10)))
  }

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const containerRect = el.getBoundingClientRect()
    const anchor = containerRect.top + containerRect.height * 0.25
    let best = 1
    let bestDist = Infinity
    const nodes = el.querySelectorAll<HTMLElement>("[data-note-page]")
    for (const node of nodes) {
      const n = Number(node.dataset["notePage"])
      const dist = Math.abs(node.getBoundingClientRect().top - anchor)
      if (dist < bestDist) {
        bestDist = dist
        best = n
      }
    }
    setCurrentPage((prev) => (prev === best ? prev : best))
  }, [])

  const handleDownload = async () => {
    if (!noteId) return
    try {
      await downloadNoteFile(noteId, noteTitle)
    } catch {
      setError("Could not start the download. Please try again.")
    }
  }

  const numPages = pages.length

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-2 z-[61] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:inset-x-10 sm:inset-y-6 lg:inset-x-20 lg:inset-y-8">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-black/5 bg-white px-4 py-2.5">
            <Dialog.Title className="truncate text-sm font-semibold text-[#0b0b0c]">
              {noteTitle}
              {numPages > 0 && (
                <span className="ml-2 text-xs font-normal text-[#8a8c8e]">
                  Page {currentPage} of {numPages}
                </span>
              )}
            </Dialog.Title>
            <div className="flex shrink-0 items-center gap-1">
              <IconButton label="Download note" onClick={() => void handleDownload()} disabled={numPages === 0}>
                <Download className="size-4" />
              </IconButton>
              <span className="mx-1 h-4 w-px bg-black/10" />
              <IconButton label="Zoom out" onClick={() => zoomStep(-0.1)} disabled={numPages === 0}>
                <Minus className="size-4" />
              </IconButton>
              <button
                type="button"
                title="Fit to width"
                onClick={() => fitToWidth()}
                disabled={numPages === 0}
                className="min-w-11 rounded-md px-1 text-center text-xs font-medium tabular-nums text-[#5f6164] transition-colors hover:bg-black/5 hover:text-[#0b0b0c] disabled:opacity-40"
              >
                {Math.round(scale * 100)}%
              </button>
              <IconButton label="Zoom in" onClick={() => zoomStep(0.1)} disabled={numPages === 0}>
                <Plus className="size-4" />
              </IconButton>
              <Dialog.Close asChild>
                <IconButton label="Close preview">
                  <X className="size-4" />
                </IconButton>
              </Dialog.Close>
            </div>
          </div>

          {/* Reader */}
          <div className="relative min-h-0 flex-1">
            <div
              ref={scrollRef}
              onScroll={onScroll}
              data-lenis-prevent
              className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain bg-[#dcdee2] px-4 py-8 sm:px-8"
            >
              {numPages > 0 && (
                <div className="mx-auto flex w-fit flex-col gap-6">
                  {pages.map((page, i) => (
                    <PdfPage key={i} page={page} pageNumber={i + 1} scale={scale} />
                  ))}
                </div>
              )}
            </div>

            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f4f4f2]">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="size-7 animate-spin text-[#686a6b]" />
                  <p className="text-xs text-[#6b6d70]">Preparing preview…</p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <p className="max-w-sm px-6 text-center text-sm text-[#c0392b]">{error}</p>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}