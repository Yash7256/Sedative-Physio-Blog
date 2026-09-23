import { prisma } from "./client.js"
import { seedCourses } from "./courses.js"
import { seedNotes } from "./notes.js"
import { seedModels } from "./models.js"

async function main() {
  await seedCourses()
  await seedNotes()
  await seedModels()
  console.log("Seeding complete")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })