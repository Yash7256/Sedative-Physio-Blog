import { Router } from "express"
import { Readable } from "node:stream"
import { listNotes, getDownload, getNoteFile } from "./service.js"
import { getObjectUrl } from "./r2.js"
import { handleError } from "../enrollments/errors.js"

export const notesRouter = Router()

// GET /api/notes — list published notes (optionally filtered by ?category=)
notesRouter.get("/", async (req, res) => {
  try {
    const category = typeof req.query["category"] === "string" ? req.query["category"] : undefined
    const notes = await listNotes(category)
    res.status(200).json(notes)
  } catch (err) {
    handleError(err, res)
  }
})

// GET /api/notes/:id/download — return a presigned download URL for the note file
notesRouter.get("/:id/download", async (req, res) => {
  try {
    const id = req.params["id"]!
    const result = await getDownload(id)
    res.status(200).json(result)
  } catch (err) {
    handleError(err, res)
  }
})

// GET /api/notes/:id/file — stream the note's PDF (same-origin so the client PDF viewer can read it)
// ?download=1 forces an attachment download instead of inline preview
notesRouter.get("/:id/file", async (req, res) => {
  try {
    const id = req.params["id"]!
    const note = await getNoteFile(id)

    const url = await getObjectUrl(note.fileKey)
    const upstream = await fetch(url)
    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ error: "Could not fetch the note file" })
      return
    }

    const disposition = req.query["download"] === "1" ? "attachment" : "inline"
    const safeName = note.fileName.replace(/["\\\r\n]/g, "")
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}"`)
    if (note.fileSize) {
      res.setHeader("Content-Length", String(note.fileSize))
    }

    Readable.fromWeb(upstream.body as never).pipe(res)
  } catch (err) {
    handleError(err, res)
  }
})

// Any other note sub-path → 404 via generic catch-all below
notesRouter.use("/:id", (_req, res) => {
  res.status(404).json({ error: "Not found" })
})