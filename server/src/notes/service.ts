import { prisma } from "../lib/prisma.js"
import { BadRequestError, NotFoundError, ServiceUnavailableError } from "../lib/errors.js"
import {
  DEFAULT_PAGE_SIZE,
  olderThan,
  pageResult,
  type Page,
  type PageRequest,
} from "../lib/pagination.js"
import { getObjectUrl, r2Configured } from "./r2.js"

export interface NoteSummary {
  id: string
  title: string
  description: string | null
  tag: string | null
  category: string
  image: string | null
  imageDark: string | null
  fileName: string | null
  fileSize: number | null
}

export interface NoteDownload {
  fileName: string
  url: string
}

export interface NoteFile {
  fileName: string
  fileKey: string
  fileSize: number | null
  updatedAt: Date
}

/** Only published notes whose upload actually completed are served. */
const VISIBLE_NOTE = { isPublished: true, status: "UPLOADED" } as const

function assertStorageConfigured(): void {
  if (!r2Configured()) {
    throw new ServiceUnavailableError("Storage is temporarily unavailable.")
  }
}

export async function listNotes(
  category?: string,
  pageRequest: PageRequest = { limit: DEFAULT_PAGE_SIZE, cursorId: null },
): Promise<Page<NoteSummary>> {
  const anchor = pageRequest.cursorId
    ? await prisma.note.findFirst({
        where: {
          id: pageRequest.cursorId,
          ...VISIBLE_NOTE,
          ...(category ? { category } : {}),
        },
        select: { createdAt: true },
      })
    : null
  if (pageRequest.cursorId && !anchor) throw new BadRequestError("Invalid cursor")

  const rows = await prisma.note.findMany({
    where: {
      ...VISIBLE_NOTE,
      ...(category ? { category } : {}),
      ...(anchor ? olderThan({ createdAt: anchor.createdAt, id: pageRequest.cursorId! }) : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageRequest.limit + 1,
    select: {
      id: true,
      title: true,
      description: true,
      tag: true,
      category: true,
      image: true,
      imageDark: true,
      fileName: true,
      fileSize: true,
    },
  })
  return pageResult(rows, pageRequest.limit)
}

export async function getDownload(id: string): Promise<NoteDownload> {
  const note = await prisma.note.findFirst({
    where: { id, ...VISIBLE_NOTE },
    select: { fileKey: true, fileName: true },
  })
  if (!note) throw new NotFoundError("Note not found")
  assertStorageConfigured()
  if (!note.fileKey) throw new NotFoundError("Note file not found")

  const url = await getObjectUrl(note.fileKey)
  return { fileName: note.fileName ?? "note", url }
}

export async function getNoteFile(id: string): Promise<NoteFile> {
  const note = await prisma.note.findFirst({
    where: { id, ...VISIBLE_NOTE },
    select: { fileKey: true, fileName: true, fileSize: true, updatedAt: true },
  })
  if (!note) throw new NotFoundError("Note not found")
  assertStorageConfigured()
  if (!note.fileKey) throw new NotFoundError("Note file not found")

  return {
    fileName: note.fileName ?? "note.pdf",
    fileKey: note.fileKey,
    fileSize: note.fileSize,
    updatedAt: note.updatedAt,
  }
}
