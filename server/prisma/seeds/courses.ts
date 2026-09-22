import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { CourseLevel, CourseStatus, LessonType } from "../../generated/prisma/client.js"
import { prisma } from "./client.js"
import { seedCategoriesAndTags } from "./categories.js"

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
  title: string
  slug: string
  shortDescription?: string
  description?: string
  thumbnail?: string
  level: CourseLevel
  estimatedHours: number
  status: CourseStatus
  isPublished: boolean
  price: number
  isFree: boolean
  tags: string[]
  categories: string[]
  highlights: { title: string; description?: string; icon?: string }[]
  requirements: string[]
  outcomes: string[]
  sections: SectionSeed[]
}

export const COURSES: CourseSeed[] = [
  {
    title: "Human Anatomy Fundamentals",
    slug: "human-anatomy-fundamentals",
    shortDescription:
      "Master the bones, muscles, and joints of the human body with interactive 3D models.",
    description:
      "A beginner-friendly, structured walkthrough of human anatomy. Covers the axial and appendicular skeleton, major muscle groups, and key joints. Includes 3D model viewers and self-paced quizzes to cement each concept.",
    thumbnail:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200",
    level: CourseLevel.BEGINNER,
    estimatedHours: 12,
    status: CourseStatus.PUBLISHED,
    isPublished: true,
    price: 0,
    isFree: true,
    tags: ["beginner", "clinical", "exam-prep"],
    categories: ["anatomy"],
    highlights: [
      { title: "Interactive 3D models", icon: "Box" },
      { title: "Structured bite-sized modules", icon: "Layers" },
      { title: "Self-paced with quizzes", icon: "GraduationCap" },
    ],
    requirements: ["Basic understanding of high-school biology"],
    outcomes: [
      "Identify all major bones and muscle groups",
      "Explain how joints move in three planes",
    ],
    sections: [
      {
        title: "Getting Started",
        lessons: [
          {
            title: "Welcome to Anatomy",
            slug: "welcome-to-anatomy",
            type: LessonType.VIDEO,
            videoUrl: "https://example.com/videos/welcome.mp4",
            duration: 480,
            isPreview: true,
          },
          {
            title: "How to use the 3D model viewer",
            slug: "how-to-use-the-3d-viewer",
            type: LessonType.ARTICLE,
            content: "A short guide to loading and inspecting each GLB model.",
            duration: 300,
          },
        ],
      },
      {
        title: "The Musculoskeletal System",
        lessons: [
          {
            title: "The Axial Skeleton",
            slug: "the-axial-skeleton",
            type: LessonType.VIDEO,
            videoUrl: "https://example.com/videos/axial-skeleton.mp4",
            duration: 900,
          },
          {
            title: "Muscle Origins and Insertions",
            slug: "muscle-origins-insertions",
            type: LessonType.ARTICLE,
            content: "Reference tables for the major upper and lower limb muscles.",
            duration: 600,
          },
          {
            title: "Skeleton Quiz 1",
            slug: "skeleton-quiz-1",
            type: LessonType.QUIZ,
            duration: 300,
          },
        ],
      },
    ],
  },
  {
    title: "Kinesiology in Practice",
    slug: "kinesiology-in-practice",
    shortDescription:
      "Connect anatomy to movement. Learn joint biomechanics and apply them to real exercises.",
    description:
      "Take anatomy into the clinic and gym. This course breaks down joint biomechanics, muscle action during compound lifts, and how to spot compensations.",
    thumbnail:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200",
    level: CourseLevel.INTERMEDIATE,
    estimatedHours: 18,
    status: CourseStatus.PUBLISHED,
    isPublished: true,
    price: 49900,
    isFree: false,
    tags: ["intermediate", "clinical", "manual-therapy"],
    categories: ["physiology", "exercise-therapy"],
    highlights: [
      { title: "Real exercise breakdowns", icon: "Dumbbell" },
      { title: "Compensation spotting", icon: "ScanEye" },
      { title: "Practical case studies", icon: "BookOpen" },
    ],
    requirements: ["Human Anatomy Fundamentals (or equivalent knowledge)"],
    outcomes: [
      "Analyze any exercise by joint action and muscle activity",
      "Detect common movement compensations",
    ],
    sections: [
      {
        title: "Joint Biomechanics",
        lessons: [
          {
            title: "Planes and Axes of Motion",
            slug: "planes-axes-of-motion",
            type: LessonType.VIDEO,
            videoUrl: "https://example.com/videos/planes-axes.mp4",
            duration: 720,
            isPreview: true,
          },
          {
            title: "The Shoulder Complex",
            slug: "shoulder-complex",
            type: LessonType.VIDEO,
            videoUrl: "https://example.com/videos/shoulder.mp4",
            duration: 960,
          },
        ],
      },
      {
        title: "Exercise Analysis",
        lessons: [
          {
            title: "Squat Depth and Hip Mechanics",
            slug: "squat-depth-hip-mechanics",
            type: LessonType.VIDEO,
            videoUrl: "https://example.com/videos/squat.mp4",
            duration: 840,
          },
          {
            title: "Case Study: Painful Shoulder Press",
            slug: "case-study-painful-shoulder-press",
            type: LessonType.PROJECT,
            content: "Analyze the provided video and write a plan.",
          },
        ],
      },
    ],
  },
  {
    title: "Manual Therapy Techniques",
    slug: "manual-therapy-techniques",
    shortDescription:
      "A practitioner-focused guide to safe, evidence-based manual therapy for the spine and limbs.",
    description:
      "For physiotherapy students and practitioners. Covers joint mobilizations, soft tissue release, and when to apply each technique safely.",
    thumbnail:
      "https://images.unsplash.com/photo-1571791484670-2c8a2296ce3e?w=1200",
    level: CourseLevel.ADVANCED,
    estimatedHours: 24,
    status: CourseStatus.PUBLISHED,
    isPublished: true,
    price: 79900,
    isFree: false,
    tags: ["advanced", "manual-therapy", "clinical"],
    categories: ["rehabilitation"],
    highlights: [
      { title: "Evidence-based protocols", icon: "ShieldCheck" },
      { title: "Safety and contraindications", icon: "AlertOctagon" },
      { title: "Live session access", icon: "Video" },
    ],
    requirements: [
      "Kinesiology in Practice (or equivalent)",
      "A willingness to practice on peers",
    ],
    outcomes: [
      "Perform grade I-IV joint mobilizations",
      "Build a safe treatment plan for common conditions",
    ],
    sections: [
      {
        title: "Foundations",
        lessons: [
          {
            title: "Grades of Mobilization",
            slug: "grades-of-mobilization",
            type: LessonType.VIDEO,
            videoUrl: "https://example.com/videos/grades.mp4",
            duration: 600,
            isPreview: true,
          },
          {
            title: "Contraindications and Red Flags",
            slug: "contraindications-red-flags",
            type: LessonType.ARTICLE,
            content: "When manual therapy is not safe to perform.",
            duration: 420,
          },
        ],
      },
      {
        title: "Spinal Techniques",
        lessons: [
          {
            title: "Cervical Spine Mobilizations",
            slug: "cervical-spine-mobilizations",
            type: LessonType.VIDEO,
            videoUrl: "https://example.com/videos/cervical.mp4",
            duration: 900,
          },
          {
            title: "Thoracic Spine Techniques",
            slug: "thoracic-spine-techniques",
            type: LessonType.LIVE_SESSION,
            duration: 3600,
          },
        ],
      },
    ],
  },
]

export async function seedCourses() {
  await seedCategoriesAndTags()
  await prisma.course.deleteMany({
    where: { slug: { notIn: COURSES.map((course) => course.slug) } },
  })
  for (const course of COURSES) {
    const saved = await prisma.course.upsert({
      where: { slug: course.slug },
      update: {
        title: course.title,
        shortDescription: course.shortDescription,
        description: course.description,
        thumbnail: course.thumbnail,
        level: course.level,
        estimatedHours: course.estimatedHours,
        status: course.status,
        isPublished: course.isPublished,
        price: course.price,
        isFree: course.isFree,
      },
      create: {
        ...course,
        highlights: undefined,
        requirements: undefined,
        outcomes: undefined,
        sections: undefined,
        tags: undefined,
        categories: undefined,
      },
    })

    await prisma.courseHighlight.deleteMany({ where: { courseId: saved.id } })
    await prisma.courseRequirement.deleteMany({ where: { courseId: saved.id } })
    await prisma.learningOutcome.deleteMany({ where: { courseId: saved.id } })
    await prisma.courseTag.deleteMany({ where: { courseId: saved.id } })
    await prisma.courseCategory.deleteMany({ where: { courseId: saved.id } })
    await prisma.courseSection.deleteMany({ where: { courseId: saved.id } })

    if (course.highlights.length > 0) {
      await prisma.courseHighlight.createMany({
        data: course.highlights.map((h, i) => ({ ...h, order: i, courseId: saved.id })),
      })
    }
    if (course.requirements.length > 0) {
      await prisma.courseRequirement.createMany({
        data: course.requirements.map((content, i) => ({ content, order: i, courseId: saved.id })),
      })
    }
    if (course.outcomes.length > 0) {
      await prisma.learningOutcome.createMany({
        data: course.outcomes.map((content, i) => ({ content, order: i, courseId: saved.id })),
      })
    }

    const categoryIds = (
      await Promise.all(
        course.categories.map(async (slug) => {
          const cat = await prisma.category.findUnique({ where: { slug } })
          return cat?.id
        }),
      )
    ).filter((id): id is string => Boolean(id))

    if (categoryIds.length > 0) {
      await prisma.courseCategory.createMany({
        data: categoryIds.map((categoryId) => ({ courseId: saved.id, categoryId })),
        skipDuplicates: true,
      })
    }

    const tagIds = (
      await Promise.all(
        course.tags.map(async (slug) => {
          const tag = await prisma.tag.findUnique({ where: { slug } })
          return tag?.id
        }),
      )
    ).filter((id): id is string => Boolean(id))

    if (tagIds.length > 0) {
      await prisma.courseTag.createMany({
        data: tagIds.map((tagId) => ({ courseId: saved.id, tagId })),
        skipDuplicates: true,
      })
    }

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
