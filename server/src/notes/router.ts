import { Readable, Transform } from "node:stream"
import { Router, type Request } from "express"
import { ipKeyGenerator } from "express-rate-limit"

import { NO_STORE } from "../lib/cache.js"
import { CATALOG_CACHE_POLICY, catalogCache } from "../lib/catalog-cache.js"
import {
  BadRequestError,
  GatewayError,
  handleError,
  NotFoundError,
  PayloadTooLargeError,
} from "../lib/errors.js"
import { parsePageRequest } from "../lib/pagination.js"
import { catalogListLimiter, createLimiter } from "../lib/rate-limit.js"
import { listNotes, getNoteFile } from "./service.js"
import { getObjectUrl } from "./r2.js"

/** Public catalog and note preview routes. Mounted before Clerk. */
export const notesPublicRouter = Router()

export const MAX_NOTE_FILE_BYTES = 25 * 1024 * 1024
const MINUTE_MS = 60 * 1000

const listCache = catalogCache.middleware({
  catalog: "notes",
  policy: CATALOG_CACHE_POLICY,
  allowedParams: ["category", "limit", "cursor"],
})

/** Public file previews are limited per IP, with IPv6 addresses halved to a /64. */
function noteFileIpKey(req: Request): string {
  return `note-file:${ipKeyGenerator(req.ip ?? "unknown")}`
}

function noteId(req: Request): string {
  const id = req.params["id"]
  if (typeof id !== "string" || !id) throw new BadRequestError("Invalid note id")
  return id
}

const fileLimiter = createLimiter({
  prefix: "note-file",
  windowMs: MINUTE_MS,
  limit: 60,
  keyGenerator: noteFileIpKey,
  failClosed: true,
})

function noteFileTimeoutMs(env: NodeJS.ProcessEnv): number {
  const parsed = Number(env.NOTE_FILE_TIMEOUT_MS ?? 30_000)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 30_000
}

/** Overridable for local tests; production defaults to a conservative 25 MiB. */
export function maxNoteFileBytes(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.NOTE_FILE_MAX_BYTES ?? MAX_NOTE_FILE_BYTES)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : MAX_NOTE_FILE_BYTES
}

/** RFC 6266 attr-char excludes these four characters that encodeURIComponent leaves alone. */
function encodeAttrChars(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (ch) =>
    `%${ch.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

/** RFC 6266 with a conservative ASCII fallback and a fully encoded UTF-8 name. */
export function noteContentDisposition(disposition: "inline" | "attachment", rawName: string): string {
  const base = rawName.split(/[\\/]/).pop()?.replace(/[\r\n]/g, "") || "note.pdf"
  const ascii = base
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/^\.+/, "") || "note.pdf"
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeAttrChars(base)}`
}

function declaredSize(upstream: Response): number | null {
  const raw = upstream.headers.get("content-length")
  if (raw === null) return null
  const parsed = Number(raw)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

// GET /api/notes — list published notes (optionally filtered by ?category=)
notesPublicRouter.get("/", catalogListLimiter, listCache, async (req, res) => {
  try {
    const category = typeof req.query["category"] === "string" ? req.query["category"] : undefined
    // Bounded so arbitrary category strings cannot mint unbounded cache keys.
    if (category !== undefined && !/^[a-z0-9-]{1,32}$/.test(category)) {
      res.status(400).json({ error: "Invalid category" })
      return
    }
    const page = await listNotes(category, parsePageRequest(req.query))
    res.status(200).json(page)
  } catch (err) {
    handleError(err, res, req)
  }
})

// GET /api/notes/:id/file — stream the note's PDF (same-origin so the client PDF viewer can read it)
// Files are public previews: no login gate, no attachment mode, and no ETag/304.
notesPublicRouter.get("/:id/file", fileLimiter, async (req, res) => {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const note = await getNoteFile(noteId(req))

    const maxBytes = maxNoteFileBytes(process.env)
    if (note.fileSize !== null && note.fileSize > maxBytes) {
      throw new PayloadTooLargeError("Note file is too large.")
    }

    let url: string
    try {
      url = await getObjectUrl(note.fileKey)
    } catch {
      throw new GatewayError("Could not fetch the note file")
    }

    const controller = new AbortController()
    // The deadline covers the whole upstream response, including a body that
    // stops streaming after its headers have arrived.
    timeout = setTimeout(() => controller.abort(), noteFileTimeoutMs(process.env))
    let upstream: Response
    try {
      upstream = await fetch(url, { signal: controller.signal })
    } catch {
      clearTimeout(timeout)
      throw new GatewayError("Could not fetch the note file")
    }

    if (upstream.status === 404) throw new NotFoundError("Note file not found")
    if (!upstream.ok || !upstream.body) throw new GatewayError("Could not fetch the note file")

    const declared = declaredSize(upstream)
    if (declared !== null && declared > maxBytes) {
      controller.abort()
      throw new PayloadTooLargeError("Note file is too large.")
    }

    res.setHeader("Cache-Control", NO_STORE)
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", noteContentDisposition("inline", note.fileName))
    if (declared !== null) res.setHeader("Content-Length", String(declared))

    const stream = Readable.fromWeb(upstream.body as never)
    let received = 0
    const limiter = new Transform({
      transform(chunk, _encoding, callback) {
        received += (chunk as Uint8Array).byteLength
        if (received > maxBytes) {
          controller.abort()
          callback(new PayloadTooLargeError("Note file is too large."))
          return
        }
        callback(null, chunk)
      },
    })
    let streamFailed = false
    const cleanup = (): void => {
      if (timeout) clearTimeout(timeout)
      res.off("close", onClose)
      res.off("error", onResponseError)
      stream.off("error", onStreamError)
      limiter.off("error", onStreamError)
      limiter.off("end", cleanup)
      limiter.off("close", cleanup)
    }
    const abortUpstream = (): void => {
      controller.abort()
      stream.destroy()
      limiter.destroy()
    }
    const onClose = (): void => {
      // A normal finish also emits close; only an unfinished response is a
      // client disconnect that should kill the upstream stream.
      if (!res.writableEnded) {
        abortUpstream()
        cleanup()
      }
    }
    const onResponseError = (): void => {
      abortUpstream()
      cleanup()
    }
    const onStreamError = (err?: unknown): void => {
      if (streamFailed) return
      streamFailed = true
      abortUpstream()
      cleanup()
      if (!res.headersSent) {
        const tooLarge = err instanceof PayloadTooLargeError
        res.status(tooLarge ? 413 : 502).json({
          error: tooLarge ? "Note file is too large." : "Could not fetch the note file",
        })
      } else {
        res.destroy()
      }
    }

    res.once("close", onClose)
    res.once("error", onResponseError)
    stream.once("error", onStreamError)
    limiter.once("error", onStreamError)
    limiter.once("end", cleanup)
    limiter.once("close", cleanup)
    stream.pipe(limiter).pipe(res)
  } catch (err) {
    if (timeout) clearTimeout(timeout)
    handleError(err, res, req)
  }
})
