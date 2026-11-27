import { withDeadline } from "../lib/deadline.js"
import { BadRequestError, NotFoundError, ServiceUnavailableError } from "../lib/errors.js"
import { prisma } from "../lib/prisma.js"
import {
  DEFAULT_PAGE_SIZE,
  olderThan,
  pageResult,
  type Page,
  type PageRequest,
} from "../lib/pagination.js"
import { r2Configured } from "./r2.js"

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
  const cursorId = pageRequest.cursorId
  let cursorCreatedAt = pageRequest.cursorCreatedAt ?? null
  if (cursorId && !cursorCreatedAt) {
    const anchor = await withDeadline(prisma.note.findFirst({
      where: {
        id: cursorId,
        ...VISIBLE_NOTE,
        ...(category ? { category } : {}),
      },
      select: { createdAt: true },
    }))
    if (!anchor) throw new BadRequestError("Invalid cursor")
    cursorCreatedAt = anchor.createdAt
  }

  const rows = await withDeadline(prisma.note.findMany({
    where: {
      ...VISIBLE_NOTE,
      ...(category ? { category } : {}),
      ...(cursorId && cursorCreatedAt
        ? olderThan({ createdAt: cursorCreatedAt, id: cursorId })
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageRequest.limit + 1,
    select: {
      id: true,
      createdAt: true,
      title: true,
      description: true,
      tag: true,
      category: true,
      image: true,
      imageDark: true,
      fileName: true,
      fileSize: true,
    },
  }))
  return pageResult(rows, pageRequest.limit)
}

export async function getNoteFile(id: string): Promise<NoteFile> {
  const note = await withDeadline(prisma.note.findFirst({
    where: { id, ...VISIBLE_NOTE },
    select: { fileKey: true, fileName: true, fileSize: true, updatedAt: true },
  }))
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
