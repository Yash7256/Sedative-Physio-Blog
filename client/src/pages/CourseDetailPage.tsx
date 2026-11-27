import { useEffect } from "react"
import { BarChart3, BookOpen, Check, Clock, FileText, Globe, PlayCircle, Rocket } from "lucide-react"

import { SmartImage } from "@/components/SmartImage"
import { useOptionalCart } from "@/lib/cartContext"
import { applyCourseSeo } from "@/lib/course-seo"
import {
  coursePricingLabel,
  coursePreviewImage,
  isSafeCatalogImageUrl,
  type CourseDetail,
  type CourseLesson,
  type LessonType,
} from "@/lib/resources"
import { useCourseDetail } from "@/lib/resources-queries"

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

function formatDuration(minutes: number | null): string {
  if (!minutes) return ""
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`.trim()
  return `${minutes}m`
}

function Syllabus({ course }: { course: CourseDetail }) {
  return (
    <section aria-labelledby="syllabus-heading">
      <h2 id="syllabus-heading" className="text-2xl font-bold tracking-[-.035em]">Course Syllabus</h2>
      <div className="mt-5 space-y-4">
        {course.sections.map((section) => (
          <div key={section.id} className="overflow-hidden rounded-[18px] border border-black/10 bg-white/70">
            <div className="border-b border-black/10 px-5 py-4">
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <p className="text-xs text-[#717376]">{section.lessons.length} lessons</p>
            </div>
            <ul className="divide-y divide-black/5">
              {section.lessons.map((lesson: CourseLesson) => {
                const Icon = lessonIcon[lesson.type] ?? BookOpen
                return (
                  <li key={lesson.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <Icon className="size-4 shrink-0 text-[#8a8b8e]" />
                    <span className="min-w-0 flex-1">{lesson.title}</span>
                    {lesson.isPreview && <span className="text-[10px] font-semibold text-[#1683f6]">PREVIEW</span>}
                    <span className="hidden text-[11px] uppercase tracking-wider text-[#a0a1a3] min-[420px]:inline">
                      {lessonTypeLabel[lesson.type] ?? "Lesson"}
                    </span>
                    {lesson.duration ? (
                      <span className="text-xs tabular-nums text-[#8a8b8e]">{formatDuration(lesson.duration)}</span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      {course.highlights.length > 0 && (
        <div className="mt-8 rounded-[18px] border border-black/10 bg-white/70 px-5 py-5">
          <h3 className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8a8b8e]">What&apos;s Included</h3>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {course.highlights.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm">
                <Check className="size-4 text-[#1683f6]" /> {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** Canonical public course page. The shell already carries metadata for crawlers;
 *  this route keeps it in sync for client-side navigation. */
export function CourseDetailPage({ slug }: { slug: string }) {
  const { data: course, isPending, error } = useCourseDetail(slug || null, Boolean(slug))
  const cart = useOptionalCart()
  const origin = typeof window === "undefined" ? "" : window.location.origin

  useEffect(() => {
    if (!course) return undefined
    return applyCourseSeo(course, origin)
  }, [course, origin])

  if (isPending) {
    return <main className="mx-auto max-w-[1080px] px-4 py-16"><p className="text-sm text-[#6b6d70]">Loading course…</p></main>
  }

  const errorMessage = error
    ? error instanceof Error ? error.message : "Could not load course"
    : null
  if (errorMessage || !course) {
    return (
      <main className="mx-auto max-w-[1080px] px-4 py-16">
        <p className="text-sm text-[#8b4b42]">{errorMessage ?? "Course not found"}</p>
        <a className="mt-4 inline-block text-sm underline" href="/resources">Back to resources</a>
      </main>
    )
  }

  const thumbnail = coursePreviewImage(course)
  const tutorImage = course.tutor && isSafeCatalogImageUrl(course.tutor.image) ? course.tutor.image : null
  const lessonCount = course.sections.reduce((total, section) => total + section.lessons.length, 0)
  const duration = course.sections.reduce(
    (total, section) => total + section.lessons.reduce((sum, lesson) => sum + (lesson.duration ?? 0), 0),
    0,
  )
  const pricingLabel = coursePricingLabel(course)
  const previewHref = `/resources?type=courses&preview=course:${encodeURIComponent(course.slug)}&previewTitle=${encodeURIComponent(course.title)}`

  return (
    <main className="mx-auto max-w-[1080px] px-4 pb-16 pt-8 sm:px-6">
      <section className="overflow-hidden rounded-[20px] bg-[#111214] text-white">
        <div className="relative">
          {thumbnail && <SmartImage src={thumbnail} alt={course.title} loading="eager" className="h-48 w-full object-cover opacity-70 sm:h-64" />}
          <div className="relative z-10 px-6 pb-7 pt-7 sm:px-9 sm:pb-9">
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em]">
              {pricingLabel}
            </span>
            <h1 className="mt-4 max-w-[760px] text-[clamp(1.75rem,3vw,2.6rem)] font-bold leading-[1.02] tracking-[-.045em]">
              {course.title}
            </h1>
            {course.shortDescription && <p className="mt-3 max-w-[640px] text-sm text-white/75">{course.shortDescription}</p>}
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5"><Globe className="size-3.5" /> {course.language}</span>
              <span className="inline-flex items-center gap-1.5"><BarChart3 className="size-3.5" /> {course.level}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" /> {formatDuration(duration) || `${course.estimatedHours ?? 0}h`}</span>
              <span className="inline-flex items-center gap-1.5"><BookOpen className="size-3.5" /> {lessonCount} lessons</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {cart && (
                <button
                  type="button"
                  onClick={() => cart.addItem({
                    id: course.id,
                    title: course.title,
                    slug: course.slug,
                    price: course.price,
                    isFree: course.isFree,
                    thumbnail,
                    level: course.level,
                    language: course.language,
                  })}
                  className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-[#111214]"
                >
                  Add to cart
                </button>
              )}
              <a href={previewHref} className="rounded-full border border-white/30 px-5 py-2.5 text-xs font-semibold">
                View in resources
              </a>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
        <Syllabus course={course} />
        <aside className="space-y-6">
          {course.tutor && (
            <div className="rounded-[18px] border border-black/10 bg-white/70 px-5 py-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8a8b8e]">Your Instructor</h2>
              <div className="mt-4 flex items-center gap-3">
                {tutorImage ? (
                  <SmartImage src={tutorImage} alt={course.tutor.name} className="size-14 rounded-full object-cover" />
                ) : (
                  <span className="grid size-14 place-items-center rounded-full bg-[#e5e5e3] text-lg font-semibold">
                    {course.tutor.name.charAt(0)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-serif text-[15px] italic">{course.tutor.name}</p>
                  {course.tutor.designation && <p className="truncate text-xs text-[#6b6d70]">{course.tutor.designation}</p>}
                </div>
              </div>
              {course.tutor.bio && <p className="mt-3 text-xs text-[#717376]">{course.tutor.bio}</p>}
            </div>
          )}
          <div className="rounded-[18px] border border-black/10 bg-white/70 px-5 py-4">
            <h2 className="text-[11px] font-bold uppercase tracking-[.18em] text-[#8a8b8e]">At a Glance</h2>
            <dl className="mt-3 divide-y divide-black/5 text-sm">
              <div className="flex justify-between py-2"><dt className="text-[#717376]">Lessons</dt><dd>{lessonCount}</dd></div>
              <div className="flex justify-between py-2"><dt className="text-[#717376]">Est. duration</dt><dd>{formatDuration(duration) || `${course.estimatedHours ?? 0}h`}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </main>
  )
}
