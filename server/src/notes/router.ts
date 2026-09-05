import { Router } from "express"
import { listNotes, getDownload } from "./service.js"
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

// Any other note sub-path → 404 via generic catch-all below
notesRouter.use("/:id", (_req, res) => {
  res.status(404).json({ error: "Not found" })
})