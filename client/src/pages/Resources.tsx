import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Box, Check, Download, Eye, Loader2, ShoppingCart, Sparkles } from "lucide-react"
import { CourseDetailModal } from "../components/CourseDetailModal"
import { NotePreviewModal } from "../components/NotePreviewModal"
import { SmartImage } from "../components/SmartImage"
import { useCart } from "../lib/cartContext"
import {
  fetchNoteDownload,
  modelToResource,
  noteToResource,
  courseToResource,
  type Resource,
  type ResourceCategory,
} from "../lib/resources"
import { flattenResourcePages, useCourseList, useModelList, useNoteList } from "../lib/resources-queries"

const ModelViewerModal = lazy(() => import("../components/ModelViewerModal").then((m) => ({ default: m.ModelViewerModal })))

interface Card extends Resource { kind: "note" | "model" | "course"; fileName: string | null; fileSize: number | null; url?: string; isFree?: boolean; price?: number }
type PreviewState = { kind: "note"; id: string; title: string } | { kind: "model"; url: string; title: string } | { kind: "course"; slug: string; title: string } | null
type ResourceFilter = "courses" | "3d-models" | "notes"

const FILTER_PARAM = "type"
const DEFAULT_FILTER: ResourceFilter = "courses"
/** Long enough to ignore a click that is immediately reversed, short enough to feel instant. */
const FILTER_DEBOUNCE_MS = 200
const SKELETON_CARDS = 3

function resourceFilterFrom(value: string | null): ResourceFilter {
  return value === "courses" || value === "3d-models" || value === "notes" ? value : DEFAULT_FILTER
}

/** Card-shaped placeholder rendered inside the selected section, never as a page overlay. */
function ResourceCardSkeleton() {
  return (
    <div data-testid="resource-card-skeleton" aria-hidden="true" className="min-w-0 animate-pulse">
      <div className="aspect-square w-full rounded-[12px] bg-[#dedfdd] sm:rounded-[18px]" />
      <div className="mt-3 h-4 w-2/3 rounded bg-[#dedfdd]" />
      <div className="mt-2 h-3 w-1/2 rounded bg-[#e9e9e7]" />
      <div className="mt-3 h-9 w-full rounded-lg bg-[#e9e9e7]" />
    </div>
  )
}

interface SectionStatus {
  label: string
  isPending: boolean
  isError: boolean
  isRefetchError: boolean
  isFetching: boolean
  isFetchingNextPage: boolean
  hasData: boolean
}

interface LoadMoreStatus {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
}

type StatusMessage = { text: string; tone: "loading" | "error" | "stale" }

function formatCoursePrice(paise: number | undefined): string {
  if (!paise) return "Free"
  const rupees = paise / 100
  return `₹${rupees.toFixed(Number.isInteger(rupees) ? 0 : 2)}`
}

/** Each section gets its own status; a failed query cannot hide a healthy one. */
function sectionStatusMessage(status: SectionStatus | undefined): StatusMessage | null {
  if (!status) return null
  if (status.isPending && !status.hasData) return { text: `Loading ${status.label}…`, tone: "loading" }
  if (status.hasData && (status.isError || status.isRefetchError)) {
    return { text: `Could not refresh ${status.label}. Showing cached results.`, tone: "stale" }
  }
  if (status.isError || status.isRefetchError) return { text: `Could not load ${status.label}.`, tone: "error" }
  // A "Load more" click is already announced by the button; don't double it.
  if (status.isFetching && !status.isFetchingNextPage) return { text: `Refreshing ${status.label}…`, tone: "loading" }
  return null
}

const statusClass: Record<StatusMessage["tone"], string> = {
  loading: "text-[#6b6d70]",
  error: "text-[#8b4b42]",
  stale: "text-[#8b6b3a]",
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
  const [searchParams, setSearchParams] = useSearchParams()
  const rawFilter = searchParams.get(FILTER_PARAM)
  // The URL is the source of truth: a shared or back-navigated URL restores the view.
  const active = resourceFilterFrom(rawFilter)
  // The tab switches immediately but its query starts after the debounce, so a
  // click that is quickly reversed never triggers a request for the abandoned tab.
  const [queriedFilter, setQueriedFilter] = useState<ResourceFilter>(active)

  useEffect(() => {
    if (rawFilter === active) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(FILTER_PARAM, active)
        return next
      },
      { replace: true },
    )
  }, [rawFilter, active, setSearchParams])

  useEffect(() => {
    if (queriedFilter === active) return undefined
    const timer = window.setTimeout(() => setQueriedFilter(active), FILTER_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [active, queriedFilter])

  const courseQuery = useCourseList({ enabled: queriedFilter === "courses", filter: queriedFilter })
  const noteQuery = useNoteList({ enabled: queriedFilter === "notes", filter: queriedFilter })
  // In production 3D models are a Coming Soon panel, so that filter never fetches.
  const modelQuery = useModelList({ enabled: queriedFilter === "3d-models" && !isProd, filter: queriedFilter })
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState>(null)

  const noteCards = useMemo<Card[]>(() => flattenResourcePages(noteQuery.data).flatMap((note) => {
    const resource = noteToResource(note)
    if (!resource) return []
    return [{ ...resource, kind: "note" as const, fileName: note.fileName, fileSize: note.fileSize }]
  }), [noteQuery.data])

  const modelCards = useMemo<Card[]>(() => flattenResourcePages(modelQuery.data).map((model) => ({
    ...modelToResource(model),
    kind: "model" as const,
    fileName: model.fileName,
    fileSize: model.fileSize,
    url: model.jsDelivrUrl,
  })), [modelQuery.data])

  const courseCards = useMemo<Card[]>(() => flattenResourcePages(courseQuery.data).map((course) => ({
    ...courseToResource(course),
    kind: "course" as const,
    fileName: "",
    fileSize: null,
    isFree: course.isFree,
    price: course.price,
  })), [courseQuery.data])

  const cards = useMemo(() => [...courseCards, ...noteCards, ...modelCards], [courseCards, noteCards, modelCards])

  const statuses: Partial<Record<ResourceCategory | "podcast", SectionStatus>> = {
    courses: {
      label: "courses",
      isPending: courseQuery.isPending,
      isError: courseQuery.isError,
      isRefetchError: courseQuery.isRefetchError,
      isFetching: courseQuery.isFetching,
      isFetchingNextPage: courseQuery.isFetchingNextPage,
      hasData: Boolean(courseQuery.data),
    },
    notes: {
      label: "notes",
      isPending: noteQuery.isPending,
      isError: noteQuery.isError,
      isRefetchError: noteQuery.isRefetchError,
      isFetching: noteQuery.isFetching,
      isFetchingNextPage: noteQuery.isFetchingNextPage,
      hasData: Boolean(noteQuery.data),
    },
    "3d-models": {
      label: "models",
      isPending: modelQuery.isPending,
      isError: modelQuery.isError,
      isRefetchError: modelQuery.isRefetchError,
      isFetching: modelQuery.isFetching,
      isFetchingNextPage: modelQuery.isFetchingNextPage,
      hasData: Boolean(modelQuery.data),
    },
  }

  const loadMore: Partial<Record<ResourceCategory | "podcast", LoadMoreStatus>> = {
    courses: {
      hasNextPage: courseQuery.hasNextPage,
      isFetchingNextPage: courseQuery.isFetchingNextPage,
      onLoadMore: () => { void courseQuery.fetchNextPage() },
    },
    notes: {
      hasNextPage: noteQuery.hasNextPage,
      isFetchingNextPage: noteQuery.isFetchingNextPage,
      onLoadMore: () => { void noteQuery.fetchNextPage() },
    },
    "3d-models": {
      hasNextPage: modelQuery.hasNextPage,
      isFetchingNextPage: modelQuery.isFetchingNextPage,
      onLoadMore: () => { void modelQuery.fetchNextPage() },
    },
  }

  const handleDownload = async (id: string) => {
    setDownloadingId(id)
    setDownloadError(null)
    try {
      const { url, fileName } = await fetchNoteDownload(id)
      const link = document.createElement("a")
      link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); link.remove()
    } catch { setDownloadError("Could not start the download. Please try again.") } finally { setDownloadingId(null) }
  }
  const openPreview = (card: Card) => {
    if (card.kind === "model" && card.url) setPreview({ kind: "model", url: card.url, title: card.title })
    if (card.kind === "note") setPreview({ kind: "note", id: card.id, title: card.title })
    if (card.kind === "course" && card.slug) setPreview({ kind: "course", slug: card.slug, title: card.title })
  }
  const visibleSections = librarySections.filter((section) => section.key === active)

  return <div className="resources-page min-h-screen overflow-hidden bg-[#f4f4f2] text-[#111214]">
    <main className="mx-auto max-w-[1280px] px-5 pb-12 sm:px-10 sm:pb-16 lg:px-[52px]">
      <section data-scroll-fade className="mx-auto grid max-w-[1280px] items-center gap-8 py-12 sm:grid-cols-[.9fr_1.1fr] sm:gap-10 sm:py-16">
        <div className="relative aspect-square w-full overflow-hidden rounded-[12px] bg-[#e9e9e7] sm:rounded-[18px]"><SmartImage data-parallax src="/mockup/bento4.webp" alt="Sedative Physio AI assistant" loading="eager" fetchPriority="high" className="h-full w-full object-cover" /></div>
        <div className="flex max-w-[520px] flex-col items-start" data-reveal><p className="flex items-center gap-1.5 text-sm text-[#737477]"><Sparkles className="size-4 text-[#1683f6]" /> AI Assistant</p><h1 className="mt-3 text-[clamp(2rem,7vw,4.35rem)] font-bold leading-[1.01] tracking-[-0.04em]">Your Physiotherapy Companion</h1><p className="mt-4 max-w-[460px] text-[15px] leading-[1.45] text-[#686a6b] sm:text-base md:text-[18px]">Ask clinical questions, simplify complex concepts &amp; get personalized learning support.</p>{isProd ? <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#101113] px-6 py-3 text-sm font-medium text-white"><Sparkles className="size-4" /> Coming Soon</span> : <button type="button" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#101113] px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"><Sparkles className="size-4" /> Unlock AI Assistant</button>}</div>
      </section>
      <section aria-label="Resource filters" className="border-y border-black/10 py-5">
        <div className="flex flex-wrap gap-2">
          {(["courses", "3d-models", "notes"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSearchParams((prev) => {
                const next = new URLSearchParams(prev)
                next.set(FILTER_PARAM, key)
                return next
              })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                active === key
                  ? "border-[#111214] bg-[#111214] text-white"
                  : "border-black/20 bg-transparent text-[#626467] hover:border-black/45 hover:text-black"
              }`}
            >
              {key === "3d-models" ? "3D Models" : key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </section>
      {downloadError && <p className="py-5 text-center text-sm text-[#8b4b42]" role="alert">{downloadError}</p>}
      <div className="mt-10 space-y-14 sm:mt-14 sm:space-y-18">{visibleSections.map((section) => {
        const comingSoon = isProd && section.key === "3d-models"
        if (comingSoon) {
          return <section key={section.key}><div className="mb-5 flex items-end justify-between gap-4"><h2 className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold leading-none tracking-[-.04em]">{section.title}</h2></div><div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-[18px] bg-[#575757] px-7 py-10 text-center text-white" data-reveal><div><p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80"><Box className="size-3.5" /> Coming Soon</p><p className="font-display mx-auto mt-5 max-w-[560px] text-[clamp(1.25rem,2.5vw,2rem)] font-semibold leading-tight tracking-[-.03em]">Interactive 3D anatomy models are on their way.</p><p className="mx-auto mt-3 max-w-[480px] text-sm leading-relaxed text-white/70">Explore bones, muscles, and joints in fully explorable 3D — coming soon to Sedative Physio.</p></div></div></section>
        }

        const dynamic = section.key === "podcast" ? [] : cards.filter((card) => card.category === section.key)
        const status = statuses[section.key]
        const message = sectionStatusMessage(status)
        const more = loadMore[section.key]
        const isFirstLoad = Boolean(status?.isPending && !status.hasData)
        if (dynamic.length === 0 && !message && !more?.hasNextPage) return null

        return <section key={section.key}>
          <div className="mb-5 flex items-end justify-between gap-4"><h2 className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold leading-none tracking-[-.04em]">{section.title}</h2></div>
          {message && <p className={`mb-4 text-sm ${statusClass[message.tone]}`} role={message.tone === "loading" ? "status" : "alert"}>{message.text}</p>}
          {isFirstLoad && <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-8 sm:gap-y-10 xl:grid-cols-3">{Array.from({ length: SKELETON_CARDS }, (_, index) => <ResourceCardSkeleton key={index} />)}</div>}
          {dynamic.length > 0 && <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-8 sm:gap-y-10 xl:grid-cols-3">{dynamic.map((card) => <LiveCard key={card.id} card={card} downloadingId={downloadingId} onOpen={openPreview} onDownload={handleDownload} />)}</div>}
          {more?.hasNextPage && <div className="mt-8 flex justify-center">
            <button type="button" onClick={more.onLoadMore} disabled={more.isFetchingNextPage} className="inline-flex items-center gap-2 rounded-full border border-black/20 px-6 py-2.5 text-sm font-medium transition-colors hover:border-black/50 disabled:cursor-not-allowed disabled:opacity-60">
              {more.isFetchingNextPage && <Loader2 className="size-4 animate-spin" />}
              {more.isFetchingNextPage ? "Loading more…" : "Load more"}
            </button>
          </div>}
        </section>
      })}</div>
      <section data-scroll-fade className="mt-16 overflow-hidden rounded-[18px] bg-[#575757] px-7 py-10 text-white sm:mt-24 sm:px-12 sm:py-14"><h2 data-reveal className="text-[clamp(2rem,4vw,4rem)] font-bold leading-none tracking-[-.04em]">Coming Soon</h2><p className="mt-4 max-w-[690px] text-sm leading-relaxed text-white/75">We’re continuously expanding our resource library. More tools and materials will be added soon to support your learning journey.</p><div className="mt-7 flex flex-wrap gap-2">{["Study Guides", "Clinical Protocols", "Video Tutorials", "Research Papers"].map((item) => <span key={item} className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white/80">{item}</span>)}</div></section>
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
      <button type="button" onClick={() => onOpen(card)} className="relative block aspect-square w-full overflow-hidden rounded-[12px] bg-[#dedfdd] text-left sm:rounded-[18px]">
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
      <div className="mt-2 flex items-start justify-between gap-2 sm:mt-4 sm:gap-3">
        <div className="min-w-0">
          {isCourse ? (
            <>
              <p className="text-base font-bold tracking-[-.03em] text-[#0b0b0c] sm:text-lg">{priceBanner}</p>
              <h3 className="mt-0.5 truncate text-sm font-medium text-[#77797b] sm:text-base">{card.title}</h3>
            </>
          ) : (
            <>
              <h3 className="truncate text-sm font-semibold tracking-[-.03em] sm:text-base">{card.title}</h3>
              <p className="mt-0.5 truncate text-xs text-[#77797b] sm:mt-1 sm:text-sm">{card.tag || card.fileName}</p>
            </>
          )}
        </div>
        {card.kind === "note" && (
          <button type="button" onClick={() => onDownload(card.id)} disabled={isDownloading} aria-label={`Download ${card.title}`} className="grid size-7 shrink-0 place-items-center rounded-full border border-black/15 transition-colors hover:bg-black hover:text-white disabled:opacity-50">
            {isDownloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          </button>
        )}
      </div>
      <div className={`mt-3 grid gap-2 ${isCourse ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        <button type="button" onClick={() => onOpen(card)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-black/15 bg-transparent px-2 py-2 text-[11px] font-medium text-[#111214] transition-colors hover:bg-black hover:text-white sm:px-3 sm:text-xs">
          <Eye className="size-3.5" /> View Details
        </button>
        {isCourse && (
          <button
            type="button"
            onClick={handleCartAction}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-medium transition-all sm:px-3 sm:text-xs ${inCart ? "bg-[#22c55e] text-white hover:bg-[#16a34a]" : "bg-[#111214] text-white hover:bg-black/80"}`}
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

