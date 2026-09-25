import { lazy, Suspense, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Check, Download, Eye, Loader2, ShoppingCart, Sparkles } from "lucide-react"
import { CourseDetailModal } from "../components/CourseDetailModal"
import { NotePreviewModal } from "../components/NotePreviewModal"
import { SmartImage } from "../components/SmartImage"
import { useCart } from "../lib/cartContext"
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

interface Card extends Resource { kind: "note" | "model" | "course"; fileName: string | null; fileSize: number | null; url?: string; isFree?: boolean; price?: number }
type PreviewState = { kind: "note"; id: string; title: string } | { kind: "model"; url: string; title: string } | { kind: "course"; slug: string; title: string } | null

function formatCoursePrice(paise: number | undefined): string {
  if (!paise) return "Free"
  const rupees = paise / 100
  return `₹${rupees.toFixed(Number.isInteger(rupees) ? 0 : 2)}`
}

const librarySections: Array<{ key: ResourceCategory | "podcast"; title: string; explore: string }> = [
  { key: "courses", title: "Courses", explore: "Explore All Courses" },
  { key: "3d-models", title: "3D Anatomy Models", explore: "Explore All Models" },
  { key: "journals", title: "Journals", explore: "Explore All Journals" },
  { key: "notes", title: "Notes", explore: "Explore All Notes" },
  { key: "podcast", title: "Podcast", explore: "Explore All Podcasts" },
]

export function Resources() {
  const isProd = import.meta.env.PROD
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
    if (card.kind === "course" && card.slug) setPreview({ kind: "course", slug: card.slug, title: card.title })
  }
  const visibleSections = active === "all" ? librarySections : librarySections.filter((section) => section.key === active)

  return <div className="resources-page min-h-screen overflow-hidden bg-[#f4f4f2] text-[#111214]">
    <main className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-5 lg:px-[52px]">
      <section data-scroll-fade className="mx-auto grid max-w-[1200px] items-center gap-10 py-8 pl-8 sm:py-10 sm:pl-50 lg:grid-cols-2">
        <div className="relative aspect-square w-full max-w-[480px] overflow-hidden rounded-[18px] bg-[#e9e9e7]"><SmartImage data-parallax src="/bento4.png" alt="Sedative Physio AI assistant" loading="eager" fetchPriority="high" className="h-full w-full object-cover" /></div>
        <div className="flex max-w-[520px] flex-col items-start" data-reveal><p className="flex items-center gap-1.5 text-sm text-[#737477]"><Sparkles className="size-4 text-[#1683f6]" /> AI Assistant</p><h1 className="mt-2 text-[clamp(2.5rem,4vw,4rem)] font-bold leading-[.92] tracking-[-.055em]">Your Physiotherapy Companion</h1><p className="mt-4 max-w-[460px] text-base leading-[1.45] text-[#65676a]">Ask clinical questions, simplify complex concepts &amp; get personalized learning support.</p>{isProd ? <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#101113] px-6 py-3 text-sm font-medium text-white"><Sparkles className="size-4" /> Coming Soon</span> : <button type="button" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#101113] px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"><Sparkles className="size-4" /> Unlock AI Assistant</button>}</div>
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
        const comingSoon = isProd && section.key === "3d-models"
        const dynamic = section.key === "podcast" ? [] : cards.filter((card) => card.category === section.key)
        const limited = active === "all" ? dynamic.slice(0, 3) : dynamic
        if (comingSoon) {
          return <section key={section.key}><div className="mb-5 flex items-end justify-between gap-4"><h2 className="text-[clamp(1.5rem,2vw,2.1rem)] font-bold tracking-[-.045em]">{section.title}</h2></div><div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-[18px] bg-[#575757] px-7 py-10 text-center text-white" data-reveal><div><p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80"><Box className="size-3.5" /> Coming Soon</p><p className="font-display mx-auto mt-5 max-w-[560px] text-[clamp(1.25rem,2.5vw,2rem)] font-semibold leading-tight tracking-[-.03em]">Interactive 3D anatomy models are on their way.</p><p className="mx-auto mt-3 max-w-[480px] text-sm leading-relaxed text-white/70">Explore bones, muscles, and joints in fully explorable 3D — coming soon to Sedative Physio.</p></div></div></section>
        }
        if (limited.length === 0) return null
        return <section key={section.key}><div className="mb-5 flex items-end justify-between gap-4"><h2 className="text-[clamp(1.5rem,2vw,2.1rem)] font-bold tracking-[-.045em]">{section.title}</h2>{active === "all" && <button type="button" onClick={() => section.key !== "podcast" && setActive(section.key as ResourceCategory)} className="text-xs text-[#696b6d] underline-offset-4 hover:underline">View all</button>}</div><div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3">{limited.map((card) => <LiveCard key={card.id} card={card} downloadingId={downloadingId} onOpen={openPreview} onDownload={handleDownload} />)}</div><button type="button" onClick={() => section.key !== "podcast" && setActive(section.key as ResourceCategory)} className="mt-8 flex w-full items-center justify-center border-t border-black/10 pt-5 text-sm text-[#707275] transition-colors hover:text-black">{section.explore}</button></section>
      })}</div>
      <section data-scroll-fade className="mt-16 overflow-hidden rounded-[18px] bg-[#575757] px-7 py-10 text-white sm:mt-24 sm:px-12 sm:py-14"><h2 data-reveal className="text-[clamp(2rem,4vw,4rem)] font-bold tracking-[-.055em]">Coming Soon</h2><p className="mt-4 max-w-[690px] text-sm leading-relaxed text-white/75">We’re continuously expanding our resource library. More tools and materials will be added soon to support your learning journey.</p><div className="mt-7 flex flex-wrap gap-2">{["Study Guides", "Clinical Protocols", "Video Tutorials", "Research Papers"].map((item) => <span key={item} className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white/80">{item}</span>)}</div></section>
    </main>
    <NotePreviewModal open={preview?.kind === "note"} onClose={() => setPreview(null)} noteId={preview?.kind === "note" ? preview.id : null} noteTitle={preview?.kind === "note" ? preview.title : ""} />
    <Suspense fallback={null}><ModelViewerModal open={preview?.kind === "model"} onClose={() => setPreview(null)} modelUrl={preview?.kind === "model" ? preview.url : null} modelName={preview?.kind === "model" ? preview.title : ""} /></Suspense>
    <CourseDetailModal open={preview?.kind === "course"} onClose={() => setPreview(null)} slug={preview?.kind === "course" ? preview.slug : null} />
  </div>
}

function LiveCard({
  card,
  downloadingId,
  onOpen,
  onDownload,
}: {
  card: Card
  downloadingId: string | null
  onOpen: (card: Card) => void
  onDownload: (id: string) => void
}) {
  const { addItem, isInCart } = useCart()
  const navigate = useNavigate()
  const isDownloading = downloadingId === card.id
  const isCourse = card.kind === "course"
  const inCart = isInCart(card.id)

  const badge =
    card.kind === "model" ? "MODEL" :
    isCourse ? (card.isFree ? "FREE" : formatCoursePrice(card.price)) :
    "NOTE"

  const topBadge =
    isCourse ? (card.isFree ? "Free" : "Paid") :
    card.kind === "model" ? "MODEL" : "NOTE"
  const topBadgeClass =
    isCourse ? (card.isFree ? "bg-[#22c55e] text-white" : "bg-[#111214]/90 text-white") :
    "bg-white/90 text-[#55575a]"

  const priceBanner =
    isCourse ? (card.isFree ? "Free" : formatCoursePrice(card.price)) : null

  const handleCartAction = () => {
    if (inCart) {
      navigate("/cart")
    } else {
      addItem({
        id: card.id,
        title: card.title,
        slug: card.slug ?? card.id,
        price: card.price,
        isFree: card.isFree ?? true,
        thumbnail: card.image || null,
        level: card.tag ?? "Beginner",
        language: "English",
      })
    }
  }

  return (
    <article className="group min-w-0">
      <button type="button" onClick={() => onOpen(card)} className="relative block aspect-[1.18] w-full overflow-hidden rounded-[12px] bg-[#dedfdd] text-left">
        {card.image || card.imageDark
          ? <div className="absolute inset-0">
              {card.image && <SmartImage src={card.image} alt={card.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035] dark:hidden" />}
              {card.imageDark && <SmartImage src={card.imageDark} alt={card.title} className="hidden h-full w-full object-cover transition duration-500 group-hover:scale-[1.035] dark:block" />}
            </div>
          : <div className="relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden bg-[#0b0b0c] px-6 text-center dark:bg-[#f4f3ef]">
              <span className="pointer-events-none absolute -bottom-10 -right-4 select-none text-[130px] font-bold leading-none tracking-[-0.06em] text-white/[0.06] dark:text-black/[0.07]">{card.title.charAt(0)}</span>
              <span className="relative text-[9px] font-semibold uppercase tracking-[0.32em] text-white/45 dark:text-black/45">{badge}</span>
              <span className="relative h-px w-8 bg-white/25 dark:bg-black/25" />
              <p className="relative font-serif text-[15px] italic leading-snug tracking-[0.01em] text-white/90 dark:text-black/85">{card.title}</p>
            </div>
        }
        <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[8px] font-bold tracking-wide ${topBadgeClass}`}>{topBadge}</span>
      </button>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {isCourse ? (
            <>
              <p className="text-lg font-bold tracking-[-.03em] text-[#0b0b0c]">{priceBanner}</p>
              <h3 className="mt-0.5 truncate text-xs font-medium text-[#77797b]">{card.title}</h3>
            </>
          ) : (
            <>
              <h3 className="truncate text-sm font-semibold tracking-[-.025em]">{card.title}</h3>
              <p className="mt-0.5 truncate text-xs text-[#77797b]">{card.tag || card.fileName}</p>
            </>
          )}
        </div>
        {card.kind === "note" && (
          <button type="button" onClick={() => onDownload(card.id)} disabled={isDownloading} aria-label={`Download ${card.title}`} className="grid size-7 shrink-0 place-items-center rounded-full border border-black/15 transition-colors hover:bg-black hover:text-white disabled:opacity-50">
            {isDownloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          </button>
        )}
      </div>
      <div className={`mt-3 grid ${isCourse ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
        <button type="button" onClick={() => onOpen(card)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-black/15 bg-transparent px-3 py-2 text-xs font-medium text-[#111214] transition-colors hover:bg-black hover:text-white">
          <Eye className="size-3.5" /> View Details
        </button>
        {isCourse && (
          <button
            type="button"
            onClick={handleCartAction}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${inCart ? "bg-[#22c55e] text-white hover:bg-[#16a34a]" : "bg-[#111214] text-white hover:bg-black/80"}`}
          >
            {inCart
              ? <><Check className="size-3.5" /> Go to Cart</>
              : <><ShoppingCart className="size-3.5" /> Add to Cart</>
            }
          </button>
        )}
      </div>
    </article>
  )
}

