import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { LessonType } from "../../generated/prisma/client.js"
import { prisma } from "./client.js"

type LessonSeed = {
  title: string
  slug: string
  type: LessonType
  content?: string
  videoUrl?: string
  duration?: number
  isPreview?: boolean
}

type SectionSeed = {
  title: string
  lessons: LessonSeed[]
}

export type CourseSeed = {
  slug: string
  title: string
  shortDescription: string
  thumbnail?: string
  level: string
  language: string
  estimatedHours?: number
  highlights?: string[]
  price: number
  isFree: boolean
  tutor: string // tutor slug (name slug)
  sections: SectionSeed[]
}

export const TUTORS: { name: string; designation?: string; image?: string; bio?: string }[] = [
  {
    name: "Akshay Kumar",
    designation: "Anatomy Instructor",
    image: "/akshay.png",
    bio: "Concept-focused anatomy educator making the subject simple, visual and clinically relevant.",
  },
  {
    name: "Dr. Sarah Whitmore",
    designation: "Senior Physiotherapist",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400",
    bio: "Senior physiotherapist with 12 years of clinical and teaching experience.",
  },
  {
    name: "Dr. Roopali Bhowal PT",
    designation: "MPT(Neurology) · Assistant Professor, IIHER · Ex-Assistant Professor, Navodaya College Of Physiotherapy",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400",
    bio: "An experienced physiotherapist and academician with 10+ years of clinical and academic experience, speciallizing in Neurological Physiotherapy and Clinical Education.",
  },
]

export const COURSES: CourseSeed[] = [
  {
    title: "Anatomy Batch",
    slug: "anatomy-batch",
    shortDescription:
      "Build a strong foundation in anatomy with a concept-focused and clinically relevant learning experience.",
    thumbnail: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200",
    level: "Beginner",
    language: "English",
    estimatedHours: 20,
    highlights: [
      "Live Lectures",
      "Demonstration with 3D Models",
      "Soft Copy of Notes",
      "Certificate of Participation",
      "MCQ Practice",
    ],
    price: 100, // ₹1.00
    isFree: false,
    tutor: "akshay-kumar",
    sections: [
      {
        title: "Bones (UL & LL)",
        lessons: [
          {
            title: "Upper Limb Bones",
            slug: "upper-limb-bones",
            type: LessonType.ARTICLE,
            content: "Bones of the shoulder, arm, forearm and hand with clinical correlates.",
          },
          {
            title: "Lower Limb Bones",
            slug: "lower-limb-bones",
            type: LessonType.ARTICLE,
            content: "Bones of the pelvis, thigh, leg and foot with their clinical importance.",
          },
        ],
      },
      {
        title: "Muscles (UL & LL)",
        lessons: [
          {
            title: "Upper Limb Muscles",
            slug: "upper-limb-muscles",
            type: LessonType.ARTICLE,
            content: "Key muscles of the upper limb — origins, insertions, actions and nerve supply.",
          },
          {
            title: "Lower Limb Muscles",
            slug: "lower-limb-muscles",
            type: LessonType.ARTICLE,
            content: "Key muscles of the lower limb — origins, insertions, actions and nerve supply.",
          },
        ],
      },
      {
        title: "Nerves (UL & LL)",
        lessons: [
          {
            title: "Upper Limb Nerves",
            slug: "upper-limb-nerves",
            type: LessonType.ARTICLE,
            content: "Brachial plexus in brief and the major nerves of the upper limb.",
          },
          {
            title: "Lower Limb Nerves",
            slug: "lower-limb-nerves",
            type: LessonType.ARTICLE,
            content: "Lumbosacral plexus in brief and the major nerves of the lower limb.",
          },
        ],
      },
      {
        title: "Arteries",
        lessons: [
          {
            title: "Arterial Supply of the Limbs",
            slug: "arterial-supply-of-the-limbs",
            type: LessonType.ARTICLE,
            content: "The major arteries of the upper and lower limbs and their pulses.",
          },
        ],
      },
      {
        title: "Surface Anatomy",
        lessons: [
          {
            title: "Surface Landmarks & Palpation",
            slug: "surface-landmarks-and-palpation",
            type: LessonType.ARTICLE,
            content: "Key bony and muscular landmarks you can feel and use in the clinic.",
          },
        ],
      },
    ],
  },
]

function tutorSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export async function seedCourses() {
  await prisma.tutor.deleteMany({
    where: { name: { notIn: TUTORS.map((t) => t.name) } },
  })
  const tutors = new Map<string, string>()
  for (const tutor of TUTORS) {
    const existing = await prisma.tutor.findFirst({ where: { name: tutor.name } })
    const saved = existing
      ? await prisma.tutor.update({ where: { id: existing.id }, data: tutor })
      : await prisma.tutor.create({ data: tutor })
    tutors.set(tutorSlug(tutor.name), saved.id)
  }

  await prisma.course.deleteMany({
    where: { slug: { notIn: COURSES.map((course) => course.slug) } },
  })
  for (const course of COURSES) {
    const tutorId = tutors.get(course.tutor) ?? null
    const saved = await prisma.course.upsert({
      where: { slug: course.slug },
      update: {
        title: course.title,
        shortDescription: course.shortDescription,
        thumbnail: course.thumbnail,
        level: course.level,
        language: course.language,
        estimatedHours: course.estimatedHours,
        highlights: course.highlights,
        price: course.price,
        isFree: course.isFree,
        isPublished: true,
        tutorId,
      },
      create: {
        title: course.title,
        slug: course.slug,
        shortDescription: course.shortDescription,
        thumbnail: course.thumbnail,
        level: course.level,
        language: course.language,
        estimatedHours: course.estimatedHours,
        highlights: course.highlights,
        price: course.price,
        isFree: course.isFree,
        isPublished: true,
        tutorId,
      },
    })

    await prisma.courseSection.deleteMany({ where: { courseId: saved.id } })
    for (const [sectionIndex, section] of course.sections.entries()) {
      const savedSection = await prisma.courseSection.create({
        data: {
          title: section.title,
          order: sectionIndex,
          courseId: saved.id,
        },
      })
      await prisma.lesson.createMany({
        data: section.lessons.map((lesson, lessonIndex) => ({
          ...lesson,
          duration: lesson.duration,
          order: lessonIndex,
          sectionId: savedSection.id,
          isPublished: true,
        })),
      })
    }

    const lessonCount = course.sections.reduce(
      (total, section) => total + section.lessons.length,
      0,
    )
    console.log(`Seeded course "${course.title}" (${course.sections.length} sections, ${lessonCount} lessons)`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  seedCourses()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}