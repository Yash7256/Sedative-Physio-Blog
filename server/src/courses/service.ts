import { classifyCoursePricing } from "../lib/course-pricing.js"
import { withDeadline } from "../lib/deadline.js"
import { BadRequestError } from "../lib/errors.js"
import {
  DEFAULT_PAGE_SIZE,
  olderThan,
  pageResult,
  type Page,
  type PageRequest,
} from "../lib/pagination.js"
import { prisma } from "../lib/prisma.js"

export interface CourseSummary {
  id: string
  title: string
  slug: string
  shortDescription: string | null
  thumbnail: string | null
  level: string
  language: string
  estimatedHours: number | null
  price: number
  isFree: boolean
}

export interface CourseDetail extends CourseSummary {
  highlights: string[]
  sections: CourseSectionSummary[]
  tutor: TutorSummary | null
}

export interface CourseSectionSummary {
  id: string
  title: string
  description: string | null
  order: number
  lessons: LessonSummary[]
}

export interface LessonSummary {
  id: string
  title: string
  slug: string
  type: "VIDEO" | "ARTICLE" | "QUIZ" | "PROJECT"
  duration: number | null
  isPreview: boolean
}

export interface TutorSummary {
  id: string
  name: string
  designation: string | null
  image: string | null
  bio: string | null
}

/** Bounds for the public detail payload; full lesson content stays authenticated. */
export const MAX_DETAIL_SECTIONS = 20
export const MAX_DETAIL_LESSONS_PER_SECTION = 50
export const MAX_DETAIL_LESSONS_TOTAL = 200

export async function listCourses(
  pageRequest: PageRequest = { limit: DEFAULT_PAGE_SIZE, cursorId: null },
): Promise<Page<CourseSummary>> {
  const cursorId = pageRequest.cursorId
  let cursorCreatedAt = pageRequest.cursorCreatedAt ?? null
  if (cursorId && !cursorCreatedAt) {
    const anchor = await withDeadline(prisma.course.findFirst({
      where: { id: cursorId, isPublished: true },
      select: { createdAt: true },
    }))
    if (!anchor) throw new BadRequestError("Invalid cursor")
    cursorCreatedAt = anchor.createdAt
  }

  const rows = await withDeadline(prisma.course.findMany({
    where: {
      isPublished: true,
      ...(cursorId && cursorCreatedAt
        ? olderThan({ createdAt: cursorCreatedAt, id: cursorId })
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageRequest.limit + 1,
    select: {
      id: true,
      createdAt: true,
      title: true,
      slug: true,
      shortDescription: true,
      thumbnail: true,
      level: true,
      language: true,
      estimatedHours: true,
      price: true,
      isFree: true,
    },
  }))
  for (const row of rows) classifyCoursePricing(row)
  return pageResult(rows, pageRequest.limit)
}

export async function getCourseBySlug(slug: string): Promise<CourseDetail | null> {
  const course = await withDeadline(prisma.course.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true,
      title: true,
      slug: true,
      shortDescription: true,
      thumbnail: true,
      level: true,
      language: true,
      estimatedHours: true,
      highlights: true,
      price: true,
      isFree: true,
      tutor: {
        select: {
          id: true,
          name: true,
          designation: true,
          image: true,
          bio: true,
        },
      },
      sections: {
        orderBy: { order: "asc" },
        take: MAX_DETAIL_SECTIONS,
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          lessons: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
            take: MAX_DETAIL_LESSONS_PER_SECTION,
            select: {
              id: true,
              title: true,
              slug: true,
              type: true,
              duration: true,
              isPreview: true,
            },
          },
        },
      },
    },
  }))
  if (!course) return null

  classifyCoursePricing(course)

  let remaining = MAX_DETAIL_LESSONS_TOTAL
  const sections = course.sections.slice(0, MAX_DETAIL_SECTIONS).map((section) => {
    const lessons = section.lessons.slice(0, remaining)
    remaining -= lessons.length
    return { ...section, lessons }
  })
  return { ...course, sections }
}