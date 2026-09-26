import { prisma } from "../../lib/prisma.js"
import type { AuditEvent } from "../constants.js"
import type { RequestContext } from "../types.js"

/**
 * Every profile event lands in `AuthAuditLog`. Centralised so the sync paths
 * can't drift on which fields get recorded, and so a future change (log
 * trimming, redaction) is a one-file edit.
 *
 * The old credential events (login_success, password_reset_*) are gone: Clerk
 * decides those and never reports them, so anything written here would be a
 * guess. This table is now the record of what *this app* did to a profile.
 */

/** Prisma's `Json` column accepts this shape; kept narrow so it can't drift. */
type AuditMetadata = Record<string, string | number | boolean | null>

export interface RecordAuditParams {
  /** Null for events with no resolvable account, e.g. a failed reset link. */
  userId?: string | null
  event: AuditEvent
  context: RequestContext
  metadata?: AuditMetadata
}

export async function recordAuditEvent({
  userId,
  event,
  context,
  metadata,
}: RecordAuditParams): Promise<void> {
  await prisma.authAuditLog.create({
    data: {
      userId: userId ?? null,
      event,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata,
    },
  })
}
