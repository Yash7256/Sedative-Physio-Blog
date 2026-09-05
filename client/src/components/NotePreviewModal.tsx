import { useEffect, useState } from "react"
import { Dialog } from "radix-ui"
import { Loader2, X } from "lucide-react"
import { fetchNoteDownload } from "../lib/resources"

interface NotePreviewModalProps {
  open: boolean
  onClose: () => void
  noteId: string | null
  noteTitle: string
}

export function NotePreviewModal({ open, onClose, noteId, noteTitle }: NotePreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !noteId) {
      setPdfUrl(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setPdfUrl(null)

    fetchNoteDownload(noteId)
      .then(({ url }) => {
        if (!cancelled) setPdfUrl(url)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the note preview. Please try again.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, noteId])

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" />
        <Dialog.Content className="fixed inset-2 z-[61] flex flex-col rounded-2xl bg-white shadow-2xl sm:inset-x-10 sm:inset-y-6 lg:inset-x-20 lg:inset-y-8">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b border-black/5 px-5 py-3">
            <Dialog.Title className="truncate text-sm font-semibold text-[#0b0b0c]">
              {noteTitle}
            </Dialog.Title>
            <div className="flex items-center gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close preview"
                  className="grid size-7 place-items-center rounded text-slate hover:text-[#0b0b0c] transition-colors"
                >
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Body */}
          <div className="relative flex-1 min-h-0">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-8 animate-spin text-[#686a6b]" />
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-[#c0392b]">{error}</p>
              </div>
            )}
            {pdfUrl && (
              <iframe
                src={pdfUrl}
                title={noteTitle}
                className="h-full w-full border-0"
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
