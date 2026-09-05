import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client.js"
import { NotFoundError } from "../enrollments/errors.js"
import {
  githubConfigured,
  jsDelivrUrl,
  uploadFile,
  deleteFile,
  listRepoModelFiles,
} from "./github.js"
import { ModelValidationError } from "./errors.js"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
})

export interface ModelSummary {
  id: string
  name: string
  fileName: string
  fileSize: number
  jsDelivrUrl: string
  createdAt: Date
}

export interface ModelUploadResult {
  id: string
  name: string
  jsDelivrUrl: string
  fileSize: number
}

export interface ModelSyncResult {
  added: ModelUploadResult[]
  existing: number
}

function fileKeyToName(path: string): string {
  const fileName = path.split("/").pop() ?? path
  return fileName.replace(/\.glb$/i, "")
}

/**
 * Scan the GitHub repo for .glb files and register any that are not yet present
 * in the database. Files already registered (matched by fileKey) are skipped.
 */
export async function syncModels(): Promise<ModelSyncResult> {
  if (!githubConfigured()) {
    throw new ModelValidationError("GitHub storage is not configured")
  }

  const repoFiles = await listRepoModelFiles()

  const existingRecords = await prisma.model3D.findMany({ select: { fileKey: true } })
  const existingKeys = new Set(existingRecords.map((r) => r.fileKey))

  const added: ModelUploadResult[] = []
  for (const file of repoFiles) {
    if (existingKeys.has(file.path)) continue

    const name = fileKeyToName(file.path)
    const record = await prisma.model3D.create({
      data: {
        name,
        fileKey: file.path,
        fileName: file.path.split("/").pop() ?? file.path,
        fileSize: file.size,
        jsDelivrUrl: jsDelivrUrl(file.path),
      },
    })
    existingKeys.add(file.path)
    added.push({
      id: record.id,
      name: record.name,
      jsDelivrUrl: record.jsDelivrUrl,
      fileSize: record.fileSize,
    })
  }

  return { added, existing: repoFiles.length - added.length }
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

export async function uploadModel(
  name: string,
  originalName: string,
  buffer: Buffer,
): Promise<ModelUploadResult> {
  if (!githubConfigured()) {
    throw new ModelValidationError("GitHub storage is not configured")
  }

  const ext = originalName.split(".").pop()?.toLowerCase()
  if (ext !== "glb") {
    throw new ModelValidationError("Only .glb files are supported")
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  const timestamp = Date.now()
  const fileKey = `models/${slug}-${timestamp}.glb`

  await uploadFile(fileKey, buffer)

  const url = jsDelivrUrl(fileKey)
  const record = await prisma.model3D.create({
    data: {
      name,
      fileKey,
      fileName: originalName,
      fileSize: buffer.length,
      jsDelivrUrl: url,
    },
  })

  return {
    id: record.id,
    name: record.name,
    jsDelivrUrl: record.jsDelivrUrl,
    fileSize: record.fileSize,
  }
}

export async function deleteModel(id: string): Promise<void> {
  const model = await prisma.model3D.findUnique({
    where: { id },
    select: { fileKey: true },
  })
  if (!model) throw new NotFoundError("Model not found")

  if (githubConfigured()) {
    await deleteFile(model.fileKey)
  }

  await prisma.model3D.delete({ where: { id } })
}
