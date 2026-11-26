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
  const anchor = pageRequest.cursorId
    ? await prisma.model3D.findFirst({
        where: { id: pageRequest.cursorId },
        select: { createdAt: true },
      })
    : null
  if (pageRequest.cursorId && !anchor) throw new BadRequestError("Invalid cursor")

  const rows = await prisma.model3D.findMany({
    where: anchor ? olderThan({ createdAt: anchor.createdAt, id: pageRequest.cursorId! }) : {},
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
  })
  return pageResult(rows, pageRequest.limit)
}
