import { prisma } from "./client.js"
import { seedCourses } from "./courses.js"
import { seedNotes } from "./notes.js"
import { seedModels } from "./models.js"
import { seedEnrollmentsAndOrders } from "./enrollments.js"

async function main() {
  // seedCourses() seeds categories/tags first
  await seedCourses()
  await seedNotes()
  await seedModels()
  await seedEnrollmentsAndOrders()
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
