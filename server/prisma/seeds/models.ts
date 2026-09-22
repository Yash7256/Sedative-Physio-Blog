import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { prisma } from "./client.js"

export type ModelSeed = {
  name: string
  fileKey: string
  fileName: string
  fileSize: number
}

export const MODELS: ModelSeed[] = [
  {
    name: "Muscular System",
    fileKey: "muscular.glb",
    fileName: "muscular.glb",
    fileSize: 8_819_872,
  },
  {
    name: "Skeleton",
    fileKey: "skeleton.glb",
    fileName: "skeleton.glb",
    fileSize: 2_722_720,
  },
]

function jsDelivrUrl(path: string): string {
  const owner = process.env.GITHUB_REPO_OWNER
  const repo = process.env.GITHUB_REPO_NAME
  const branch = process.env.GITHUB_REPO_BRANCH ?? "main"
  return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`
}

export async function seedModels() {
  await prisma.model3D.deleteMany({
    where: { name: { notIn: MODELS.map((model) => model.name) } },
  })
  for (const model of MODELS) {
    const payload = {
      fileKey: model.fileKey,
      fileName: model.fileName,
      fileSize: model.fileSize,
      jsDelivrUrl: jsDelivrUrl(model.fileKey),
    }
    const existing = await prisma.model3D.findFirst({ where: { name: model.name } })
    if (existing) {
      await prisma.model3D.update({ where: { id: existing.id }, data: payload })
    } else {
      await prisma.model3D.create({ data: { name: model.name, ...payload } })
    }
    console.log(`Seeded 3D model "${model.name}" (${payload.jsDelivrUrl})`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  seedModels()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
