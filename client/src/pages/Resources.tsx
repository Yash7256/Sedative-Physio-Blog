import { lazy, Suspense, useEffect, useState } from "react"
import { BookOpen, Box, Download, FileText, GraduationCap, Loader2, Sparkles } from "lucide-react"
import { NotePreviewModal } from "../components/NotePreviewModal"
import {
  fetchNotes,
  fetchNoteDownload,
  fetchModels,
  fetchCourses,
  modelToResource,
  noteToResource,
  courseToResource,
  type Resource,
  type ResourceCategory,
} from "../lib/resources"

const ModelViewerModal = lazy(() => import("../components/ModelViewerModal").then((m) => ({ default: m.ModelViewerModal })))

interface Card extends Resource { kind: "note" | "model" | "course"; fileName: string; fileSize: number | null; url?: string; isFree?: boolean; price?: number }
type PreviewState = { kind: "note"; id: string; title: string } | { kind: "model"; url: string; title: string } | null

const librarySections: Array<{ key: ResourceCategory | "podcast"; title: string; explore: string }> = [
  { key: "courses", title: "Courses", explore: "Explore All Courses" },
  { key: "3d-models", title: "3D Anatomy Models", explore: "Explore All Models" },
  { key: "journals", title: "Journals", explore: "Explore All Journals" },
  { key: "notes", title: "Notes", explore: "Explore All Notes" },
  { key: "podcast", title: "Podcast", explore: "Explore All Podcasts" },
]

export function Resources() {
  const [active, setActive] = useState<ResourceCategory | "all">("all")
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchNotes(), fetchModels(), fetchCourses()]).then(([noteList, modelList, courseList]) => {
      if (cancelled) return
      const noteCards: Card[] = noteList
        .map(noteToResource)
        .filter((r): r is Resource => r !== null)
        .map((r) => {
          const note = noteList.find((n) => n.id === r.id)!
          return { ...r, kind: "note" as const, fileName: note.fileName, fileSize: note.fileSize }
        })
      const modelCards: Card[] = modelList.map((model) => ({
        ...modelToResource(model),
        kind: "model" as const,
        fileName: model.fileName,
        fileSize: model.fileSize,
        url: model.jsDelivrUrl,
      }))
      const courseCards: Card[] = courseList.map((course) => ({
        ...courseToResource(course),
        kind: "course" as const,
        fileName: "",
        fileSize: null,
        isFree: course.isFree,
        price: course.price,
      }))
      setCards([...courseCards, ...noteCards, ...modelCards])
    }).catch(() => !cancelled && setError("Could not load the latest library items. You can still explore the catalogue below."))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  const handleDownload = async (id: string) => {
    setDownloadingId(id)
    try {
      const { url, fileName } = await fetchNoteDownload(id)
      const link = document.createElement("a")
      link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); link.remove()
    } catch { setError("Could not start the download. Please try again.") } finally { setDownloadingId(null) }
  }
  const openPreview = (card: Card) => {
    if (card.kind === "model" && card.url) setPreview({ kind: "model", url: card.url, title: card.title })
    if (card.kind === "note") setPreview({ kind: "note", id: card.id, title: card.title })
  }
  const visibleSections = active === "all" ? librarySections : librarySections.filter((section) => section.key === active)

  return <div className="resources-page min-h-screen overflow-hidden bg-[#f4f4f2] text-[#111214]">
    <main className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-5 lg:px-[52px]">
      <section data-scroll-fade className="mx-auto grid max-w-[1200px] items-center gap-10 py-8 pl-8 sm:py-10 sm:pl-50 lg:grid-cols-2">
        <div className="relative aspect-square w-full max-w-[480px] overflow-hidden rounded-[18px] bg-[#e9e9e7]"><img data-parallax src="/bento4.png" alt="Sedative Physio AI assistant" className="h-full w-full object-cover" /><span className="absolute right-2 top-2 rounded-full bg-[#1683f6] px-3 py-1 text-[10px] font-bold tracking-[.08em] text-white">NEW</span></div>
        <div className="flex max-w-[520px] flex-col items-start" data-reveal><p className="flex items-center gap-1.5 text-sm text-[#737477]"><Sparkles className="size-4 text-[#1683f6]" /> AI Assistant</p><h1 className="mt-2 text-[clamp(2.5rem,4vw,4rem)] font-bold leading-[.92] tracking-[-.055em]">Your Physiotherapy Companion</h1><p className="mt-4 max-w-[460px] text-base leading-[1.45] text-[#65676a]">Ask clinical questions, simplify complex concepts &amp; get personalized learning support.</p><button type="button" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#101113] px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"><Sparkles className="size-4" /> Unlock AI Assistant</button></div>
      </section>
      <section aria-label="Resource filters" className="border-y border-black/10 py-5">
        <div className="flex flex-wrap gap-2">
          {(["all", "courses", "3d-models", "notes"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key === "all" ? "all" : key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                active === key
                  ? "border-[#111214] bg-[#111214] text-white"
                  : "border-black/20 bg-transparent text-[#626467] hover:border-black/45 hover:text-black"
              }`}
            >
              {key === "all" ? "All" : key === "3d-models" ? "3D Models" : key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </section>
      {loading && <div className="py-12 text-center"><Loader2 className="mx-auto size-6 animate-spin text-[#6b6d70]" /><p className="mt-3 text-sm text-[#6b6d70]">Loading latest resources…</p></div>}
      {error && <p className="py-5 text-center text-sm text-[#8b4b42]">{error}</p>}
      <div className="mt-10 space-y-14 sm:mt-14 sm:space-y-18">{visibleSections.map((section) => {
        const dynamic = section.key === "podcast" ? [] : cards.filter((card) => card.category === section.key).slice(0, 3)
        if (dynamic.length === 0) return null
        return <section key={section.key}><div className="mb-5 flex items-end justify-between gap-4"><h2 className="text-[clamp(1.5rem,2vw,2.1rem)] font-bold tracking-[-.045em]">{section.title}</h2>{active === "all" && <button type="button" onClick={() => section.key !== "podcast" && setActive(section.key as ResourceCategory)} className="text-xs text-[#696b6d] underline-offset-4 hover:underline">View all</button>}</div><div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3">{dynamic.map((card) => <LiveCard key={card.id} card={card} downloadingId={downloadingId} onOpen={openPreview} onDownload={handleDownload} />)}</div><button type="button" onClick={() => section.key !== "podcast" && setActive(section.key as ResourceCategory)} className="mt-8 flex w-full items-center justify-center border-t border-black/10 pt-5 text-sm text-[#707275] transition-colors hover:text-black">{section.explore}</button></section>
      })}</div>
      <section data-scroll-fade className="mt-16 overflow-hidden rounded-[18px] bg-[#575757] px-7 py-10 text-white sm:mt-24 sm:px-12 sm:py-14"><h2 data-reveal className="text-[clamp(2rem,4vw,4rem)] font-bold tracking-[-.055em]">Coming Soon</h2><p className="mt-4 max-w-[690px] text-sm leading-relaxed text-white/75">We’re continuously expanding our resource library. More tools and materials will be added soon to support your learning journey.</p><div className="mt-7 flex flex-wrap gap-2">{["Study Guides", "Clinical Protocols", "Video Tutorials", "Research Papers"].map((item) => <span key={item} className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white/80">{item}</span>)}</div></section>
    </main>
    <NotePreviewModal open={preview?.kind === "note"} onClose={() => setPreview(null)} noteId={preview?.kind === "note" ? preview.id : null} noteTitle={preview?.kind === "note" ? preview.title : ""} />
    <Suspense fallback={null}><ModelViewerModal open={preview?.kind === "model"} onClose={() => setPreview(null)} modelUrl={preview?.kind === "model" ? preview.url : null} modelName={preview?.kind === "model" ? preview.title : ""} /></Suspense>
  </div>
}

function LiveCard({ card, downloadingId, onOpen, onDownload }: { card: Card; downloadingId: string | null; onOpen: (card: Card) => void; onDownload: (id: string) => void }) {
  const isDownloading = downloadingId === card.id

  const badge =
    card.kind === "model" ? "MODEL" :
    card.kind === "course" ? (card.isFree ? "FREE" : `₹${((card.price ?? 0) / 100).toFixed(0)}`) :
    "NOTE"

  const placeholder =
    card.kind === "model" ? <Box className="size-14 text-[#576f70]" /> :
    card.kind === "course" ? <GraduationCap className="size-14 text-[#d35400]" /> :
    <FileText className="size-14 text-[#766bb1]" />

  const action =
    card.kind === "note" ? (
      <button type="button" onClick={() => onDownload(card.id)} disabled={isDownloading} aria-label={`Download ${card.title}`} className="grid size-7 shrink-0 place-items-center rounded-full border border-black/15 transition-colors hover:bg-black hover:text-white disabled:opacity-50">
        {isDownloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
      </button>
    ) : (
      <button type="button" onClick={() => onOpen(card)} aria-label={`Open ${card.title}`} className="grid size-7 shrink-0 place-items-center rounded-full border border-black/15 transition-colors hover:bg-black hover:text-white">
        <BookOpen className="size-3.5" />
      </button>
    )

  return (
    <article className="group min-w-0">
      <button type="button" onClick={() => onOpen(card)} className="relative block aspect-[1.18] w-full overflow-hidden rounded-[12px] bg-[#dedfdd] text-left">
        {card.image
          ? <img src={card.image} alt={card.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
          : <div className="flex h-full items-center justify-center bg-[#e5e5e2]">{placeholder}</div>
        }
        <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-bold tracking-wide text-[#55575a]">{badge}</span>
      </button>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-[-.025em]">{card.title}</h3>
          <p className="mt-0.5 truncate text-xs text-[#77797b]">{card.tag || card.fileName}</p>
        </div>
        {action}
      </div>
    </article>
  )
}
