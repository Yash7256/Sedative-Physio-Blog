import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client.js"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
})

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
