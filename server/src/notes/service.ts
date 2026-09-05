import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client.js"
import { NotFoundError } from "../enrollments/errors.js"
import { ValidationError } from "./errors.js"
import { getObjectUrl, r2Configured } from "./r2.js"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
})

export interface NoteSummary {
  id: string
  title: string
  description: string | null
  tag: string | null
  category: string
  image: string | null
  fileName: string
  fileSize: number | null
}

export interface NoteDownload {
  fileName: string
  url: string
}

export async function listNotes(category?: string): Promise<NoteSummary[]> {
  const notes = await prisma.note.findMany({
    where: {
      isPublished: true,
      ...(category ? { category } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      tag: true,
      category: true,
      image: true,
      fileName: true,
      fileSize: true,
    },
  })
  return notes
}

export async function getDownload(id: string): Promise<NoteDownload> {
  const note = await prisma.note.findFirst({
    where: { id, isPublished: true },
    select: { fileKey: true, fileName: true },
  })
  if (!note) throw new NotFoundError("Note not found")
  if (!r2Configured()) {
    throw new ValidationError("R2 storage is not configured")
  }
  const url = await getObjectUrl(note.fileKey)
  return { fileName: note.fileName, url }
}