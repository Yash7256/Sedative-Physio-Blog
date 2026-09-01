import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client.js"
import { BadRequestError, ConflictError, NotFoundError } from "./errors.js"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
})

export interface EnrollmentWithCourse {
  courseId: string
  title: string
  slug: string
  thumbnail: string | null
  enrolledAt: string // ISO 8601
}

export interface EnrollmentStatus {
  enrolled: boolean
  enrolledAt?: string // ISO 8601, present only when enrolled === true
}

export async function enrollFree(
  clerkUserId: string,
  courseId: string,
): Promise<{
  enrollmentId: string
  courseId: string
  clerkUserId: string
  source: string
  enrolledAt: string
}> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, isPublished: true },
  })
  if (!course) {
    throw new NotFoundError("Course not found")
  }
  if (course.price > 0 || !course.isFree) {
    throw new BadRequestError("Course requires payment")
  }
  const existing = await prisma.enrollment.findUnique({
    where: { clerkUserId_courseId: { clerkUserId, courseId } },
  })
  if (existing) {
    throw new ConflictError("Already enrolled in this course")
  }
  const enrollment = await prisma.enrollment.create({
    data: { clerkUserId, courseId, source: "FREE" },
  })
  return {
    enrollmentId: enrollment.id,
    courseId: enrollment.courseId,
    clerkUserId: enrollment.clerkUserId,
    source: enrollment.source,
    enrolledAt: enrollment.enrolledAt.toISOString(),
  }
}

export async function listEnrollments(
  clerkUserId: string,
): Promise<EnrollmentWithCourse[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { clerkUserId },
    orderBy: { enrolledAt: "desc" },
    take: 500,
    include: {
      course: {
        select: { title: true, slug: true, thumbnail: true },
      },
    },
  })
  return enrollments.map((e) => ({
    courseId: e.courseId,
    title: e.course.title,
    slug: e.course.slug,
    thumbnail: e.course.thumbnail,
    enrolledAt: e.enrolledAt.toISOString(),
  }))
}

export async function getEnrollmentStatus(
  clerkUserId: string,
  courseId: string,
): Promise<EnrollmentStatus> {
  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) {
    throw new NotFoundError("Course not found")
  }
  const enrollment = await prisma.enrollment.findUnique({
    where: { clerkUserId_courseId: { clerkUserId, courseId } },
  })
  if (!enrollment) {
    return { enrolled: false }
  }
  return { enrolled: true, enrolledAt: enrollment.enrolledAt.toISOString() }
}

export async function isEnrolled(
  clerkUserId: string,
  courseId: string,
): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { clerkUserId_courseId: { clerkUserId, courseId } },
  })
  return enrollment !== null
}
