import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { prisma } from "./client.js"

export const CATEGORIES = [
  { name: "Anatomy", slug: "anatomy" },
  { name: "Physiology", slug: "physiology" },
  { name: "Rehabilitation", slug: "rehabilitation" },
  { name: "Exercise Therapy", slug: "exercise-therapy" },
]

export const TAGS = [
  "beginner",
  "intermediate",
  "advanced",
  "clinical",
  "exam-prep",
  "manual-therapy",
  "upper-limb",
  "lower-limb",
].map((slug) => ({ name: slug.replace(/-/g, " "), slug }))

export async function seedCategoriesAndTags() {
  await prisma.category.deleteMany({
    where: { slug: { notIn: CATEGORIES.map((cat) => cat.slug) } },
  })
  await prisma.tag.deleteMany({
    where: { slug: { notIn: TAGS.map((tag) => tag.slug) } },
  })
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    })
  }
  for (const tag of TAGS) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: tag,
    })
  }
  console.log(`Seeded ${CATEGORIES.length} categories and ${TAGS.length} tags`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  seedCategoriesAndTags()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
