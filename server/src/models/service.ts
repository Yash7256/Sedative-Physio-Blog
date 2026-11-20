import { prisma } from "../lib/prisma.js"

export interface ModelSummary {
  id: string
  name: string
  fileName: string
  fileSize: number
  jsDelivrUrl: string
  createdAt: Date
}

export async function listModels(): Promise<ModelSummary[]> {
  return prisma.model3D.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      fileName: true,
      fileSize: true,
      jsDelivrUrl: true,
      createdAt: true,
    },
  })
}
