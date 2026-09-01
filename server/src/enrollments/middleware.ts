import type { NextFunction, Request, Response } from "express"
import { getAuth } from "@clerk/express"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client.js"
import { isEnrolled } from "./service.js"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
})

export async function enrollmentGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const lessonId = req.params["lessonId"]
  const lessonSlug = req.params["lessonSlug"]

  // Step 1: resolve the lesson (and its courseId via section relation)
  let lesson: { isPreview: boolean; section: { courseId: string } } | null = null

  if (lessonId) {
    lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        isPreview: true,
        section: { select: { courseId: true } },
      },
    })
  } else if (lessonSlug) {
    lesson = await prisma.lesson.findFirst({
      where: { slug: lessonSlug },
      select: {
        isPreview: true,
        section: { select: { courseId: true } },
      },
    })
  }

  // Step 2: 404 if not found
  if (!lesson) {
    res.status(404).json({ error: "Lesson not found" })
    return
  }

  // Step 3: preview lessons are always accessible
  if (lesson.isPreview) {
    next()
    return
  }

  // Step 4: require auth
  const { userId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }

  // Step 5: check enrollment
  const courseId = lesson.section.courseId
  const enrolled = await isEnrolled(userId, courseId)
  if (!enrolled) {
    res.status(403).json({ error: "Not enrolled in this course" })
    return
  }

  // Step 6: allow
  next()
}
