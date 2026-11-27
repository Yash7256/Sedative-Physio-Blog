import { withDeadline } from "../lib/deadline.js"
import { BadRequestError } from "../lib/errors.js"
import {
  DEFAULT_PAGE_SIZE,
  olderThan,
  pageResult,
  type Page,
  type PageRequest,
} from "../lib/pagination.js"
import { prisma } from "../lib/prisma.js"

export interface ModelSummary {
  id: string
  name: string
  fileName: string
  fileSize: number
  jsDelivrUrl: string
  createdAt: Date
}

export async function listModels(
  pageRequest: PageRequest = { limit: DEFAULT_PAGE_SIZE, cursorId: null },
): Promise<Page<ModelSummary>> {
  const cursorId = pageRequest.cursorId
  let cursorCreatedAt = pageRequest.cursorCreatedAt ?? null
  if (cursorId && !cursorCreatedAt) {
    const anchor = await withDeadline(prisma.model3D.findFirst({
      where: { id: cursorId },
      select: { createdAt: true },
    }))
    if (!anchor) throw new BadRequestError("Invalid cursor")
    cursorCreatedAt = anchor.createdAt
  }

  const rows = await withDeadline(prisma.model3D.findMany({
    where: cursorId && cursorCreatedAt
      ? olderThan({ createdAt: cursorCreatedAt, id: cursorId })
      : {},
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageRequest.limit + 1,
    select: {
      id: true,
      name: true,
      fileName: true,
      fileSize: true,
      jsDelivrUrl: true,
      createdAt: true,
    },
  }))
  // Models expose createdAt in their public contract, unlike course/note rows.
  return pageResult(rows, pageRequest.limit, (row) => row)
}
