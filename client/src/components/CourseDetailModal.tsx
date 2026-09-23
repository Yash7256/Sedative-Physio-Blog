import { useEffect, useRef, useState } from "react"
import { Dialog } from "radix-ui"
import {
  BarChart3,
  BookOpen,
  Check,
  Clock,
  FileText,
  Globe,
  GraduationCap,
  Loader2,
  PlayCircle,
  Rocket,
  X,
} from "lucide-react"
import { SmartImage } from "./SmartImage"
import {
  fetchCourseDetail,
  type CourseDetail as CourseDetailData,
  type CourseLesson,
  type CourseSection,
  type LessonType,
} from "../lib/resources"

interface CourseDetailModalProps {
  open: boolean
  onClose: () => void
  slug: string | null
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return ""
  const total = minutes
  if (total >= 60) return `${Math.floor(total / 60)}h ${total % 60 ? `${total % 60}m` : ""}`.trim()
  return `${total}m`
}

const lessonIcon: Record<LessonType, typeof BookOpen> = {
  VIDEO: PlayCircle,
  ARTICLE: FileText,
  QUIZ: BookOpen,
  PROJECT: Rocket,
}

const lessonTypeLabel: Record<LessonType, string> = {
  VIDEO: "Video",
  ARTICLE: "Article",
  QUIZ: "Quiz",
  PROJECT: "Project",
}

function SyllabusSection({ section, index }: { section: CourseSection; index: number }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-black/10 bg-white/70">
      <div className="flex items-center gap-3 border-b border-black/10 px-5 py-4 sm:px-6">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#111214] font-semibold text-white">
          {index + 1}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-[-.02em] sm:text-base">{section.title}</h3>
          <p className="text-xs text-[#717376]">{section.lessons.length} lessons</p>
        </div>
      </div>
      <ul className="divide-y divide-black/5">
        {section.lessons.map((lesson: CourseLesson) => {
          const Icon = lessonIcon[lesson.type]
          return (
            <li key={lesson.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
              <Icon className="size-4 shrink-0 text-[#8a8b8e]" />
              <span className="min-w-0 flex-1 truncate text-sm text-[#3c3e41]">{lesson.title}</span>
              {lesson.isPreview && (
                <span className="shrink-0 rounded-full bg-[#1683f6]/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#1683f6]">
                  PREVIEW
                </span>
              )}
              <span className="hidden shrink-0 text-[11px] uppercase tracking-wider text-[#a0a1a3] min-[420px]:inline">
                {lessonTypeLabel[lesson.type]}
              </span>
              {lesson.duration && (
                <span className="shrink-0 text-xs tabular-nums text-[#8a8b8e]">{formatDuration(lesson.duration)}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function CourseDetailModal({ open, onClose, slug }: CourseDetailModalProps) {
  const [course, setCourse] = useState<CourseDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !slug) {
      setCourse(null)
      setError(null)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    fetchCourseDetail(slug)
      .then((data) => !cancelled && setCourse(data))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Could not load course"))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [open, slug])

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
    if (open) scrollRef.current?.scrollTo({ top: 0 })
  }, [open, slug])

  const lessonCount = course?.sections.reduce((total, section) => total + section.lessons.length, 0) ?? 0
  const totalDuration = course?.sections.reduce(
    (total, section) => total + section.lessons.reduce((sum, l) => sum + (l.duration ?? 0), 0),
    0,
  ) ?? 0
  const meta = course
    ? [
        { icon: Globe, label: course.language },
        { icon: BarChart3, label: course.level },
        { icon: Clock, label: formatDuration(totalDuration) || `${course.estimatedHours ?? 0}h` },
        { icon: BookOpen, label: `${lessonCount} lessons` },
      ]
    : []

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-2 z-[61] flex flex-col overflow-hidden rounded-2xl bg-[#f4f4f2] text-[#111214] shadow-2xl sm:inset-x-8 sm:inset-y-6 lg:inset-x-20 lg:inset-y-8">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 bg-[#f4f4f2]/90 px-4 py-2.5 backdrop-blur sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <GraduationCap className="size-4 shrink-0 text-[#1683f6]" />
              <Dialog.Title className="truncate text-sm font-semibold tracking-[-.02em] text-[#0b0b0c]">
                {course?.title ?? "Course details"}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close course details"
                className="grid size-8 shrink-0 place-items-center rounded-full border border-black/10 text-[#686a6b] transition-colors hover:border-black/20 hover:text-[#0b0b0c]"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div ref={scrollRef} data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading && (
              <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
                <Loader2 className="size-7 animate-spin text-[#686a6b]" />
                <p className="text-sm text-[#6b6d70]">Loading course…</p>
              </div>
            )}

            {!loading && (error || !course) && (
              <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
                <p className="text-sm text-[#8b4b42]">{error ?? "Course not found"}</p>
              </div>
            )}

            {!loading && course && (
              <div className="mx-auto max-w-[1080px] px-4 pb-16 sm:px-5 lg:px-8">
                {/* ── Hero ── */}
                <section className="mt-6 overflow-hidden rounded-[20px] bg-[#111214] text-white">
                  <div className="relative">
                    {course.thumbnail && (
                      <SmartImage src={course.thumbnail} alt={course.title} className="h-48 w-full object-cover opacity-70 sm:h-64" />
                    )}
                    <div className={`absolute inset-0 bg-gradient-to-t ${course.thumbnail ? "from-[#111214] via-[#111214]/55 to-transparent" : "hidden"}`} />
                    <div className="relative z-10 -mt-8 px-6 pb-7 sm:-mt-12 sm:px-9 sm:pb-9">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-white/90">
                          <GraduationCap className="size-3.5" /> Course
                        </span>
                        {course.isFree ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-white">Free</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f59e0b] px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-white">₹{((course.price ?? 0) / 100).toFixed(0)}</span>
                        )}
                      </div>
                      <h2 className="mt-4 max-w-[760px] text-[clamp(1.75rem,3vw,2.6rem)] font-bold leading-[1.02] tracking-[-.045em]">
                        {course.title}
                      </h2>
                      {course.shortDescription && (
                        <p className="mt-3 max-w-[640px] text-sm leading-relaxed text-white/75 sm:text-base">{course.shortDescription}</p>
                      )}
                      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/70">
                        {meta.map(({ icon: Icon, label }) => (
                          <span key={label} className="inline-flex items-center gap-1.5">
                            <Icon className="size-3.5" /> {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* ── Body ── */}
                <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
                  <section>
                    <h3 className="text-[clamp(1.3rem,2vw,1.6rem)] font-bold tracking-[-.035em]">Course Syllabus</h3>
                    <div className="mt-5 space-y-4">
                      {course.sections.map((section, index) => (
                        <SyllabusSection key={section.id} section={section} index={index} />
                      ))}
                    </div>
                    {course.highlights.length > 0 && (
                      <div className="mt-8 rounded-[18px] border border-black/10 bg-white/70 px-5 py-5 sm:px-6">
                        <h4 className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8a8b8e]">What's Included</h4>
                        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                          {course.highlights.map((item) => (
                            <li key={item} className="flex items-center gap-2.5 text-sm text-[#3c3e41]">
                              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#1683f6]/10 text-[#1683f6]">
                                <Check className="size-3" />
                              </span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </section>

                  <aside className="space-y-6">
                    {course.tutor && (
                      <div className="overflow-hidden rounded-[18px] border border-black/10 bg-white/70">
                        <div className="px-5 py-4">
                          <h4 className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8a8b8e]">Your Instructor</h4>
                          <div className="mt-4 flex items-center gap-3">
                            {course.tutor.image ? (
                              <SmartImage src={course.tutor.image} alt={course.tutor.name} className="size-14 rounded-full object-cover" />
                            ) : (
                              <span className="grid size-14 place-items-center rounded-full bg-[#e5e5e3] text-lg font-semibold text-[#77797b]">
                                {course.tutor.name.charAt(0)}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-serif text-[15px] italic tracking-[.01em]">{course.tutor.name}</p>
                              {course.tutor.designation && <p className="truncate text-xs text-[#6b6d70]">{course.tutor.designation}</p>}
                            </div>
                          </div>
                          {course.tutor.bio && <p className="mt-3 text-xs leading-relaxed text-[#717376]">{course.tutor.bio}</p>}
                        </div>
                      </div>
                    )}

                    <div className="rounded-[18px] border border-black/10 bg-white/70 px-5 py-4">
                      <h4 className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8a8b8e]">At a Glance</h4>
                      <dl className="mt-3 divide-y divide-black/5 text-sm">
                        <div className="flex items-center justify-between py-2">
                          <dt className="text-[#717376]">Course level</dt>
                          <dd className="font-medium">{course.level}</dd>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <dt className="text-[#717376]">Language</dt>
                          <dd className="font-medium">{course.language}</dd>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <dt className="text-[#717376]">Sections</dt>
                          <dd className="font-medium">{course.sections.length}</dd>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <dt className="text-[#717376]">Lessons</dt>
                          <dd className="font-medium">{lessonCount}</dd>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <dt className="text-[#717376]">Est. duration</dt>
                          <dd className="font-medium">{formatDuration(totalDuration) || `${course.estimatedHours ?? 0}h`}</dd>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <dt className="text-[#717376]">Price</dt>
                          <dd className="font-semibold">{course.isFree ? "Free" : `₹${((course.price ?? 0) / 100).toFixed(0)}`}</dd>
                        </div>
                      </dl>
                    </div>
                  </aside>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}