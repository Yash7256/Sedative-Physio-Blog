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

export async function listCourses(): Promise<CourseSummary[]> {
  return prisma.course.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
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
  })
}

export async function getCourseBySlug(slug: string): Promise<CourseDetail | null> {
  return prisma.course.findFirst({
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
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          lessons: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
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
  })
}