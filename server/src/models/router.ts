import { Router } from "express"
import multer from "multer"
import { requireAuth } from "../auth/middleware.js"
import { listModels, uploadModel, deleteModel, syncModels } from "./service.js"
import { handleError } from "../enrollments/errors.js"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith(".glb")) {
      cb(null, true)
    } else {
      cb(new Error("Only .glb files are allowed"))
    }
  },
})

export const modelsRouter = Router()

// GET /api/models — list all uploaded 3D models
modelsRouter.get("/", async (_req, res) => {
  try {
    const models = await listModels()
    res.status(200).json(models)
  } catch (err) {
    handleError(err, res)
  }
})

// POST /api/models/upload — upload a GLB file (requires auth)
modelsRouter.post(
  "/upload",
  requireAuth,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message })
        return
      }
      next()
    })
  },
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" })
        return
      }
      const name =
        typeof req.body["name"] === "string"
          ? req.body["name"]
          : req.file.originalname.replace(/\.glb$/i, "")

      const result = await uploadModel(name, req.file.originalname, req.file.buffer)
      res.status(201).json(result)
    } catch (err) {
      handleError(err, res)
    }
  },
)

// POST /api/models/sync — register .glb files from the GitHub repo that are not yet in the DB
modelsRouter.post("/sync", requireAuth, async (_req, res) => {
  try {
    const result = await syncModels()
    res.status(200).json(result)
  } catch (err) {
    handleError(err, res)
  }
})

// DELETE /api/models/:id — delete a 3D model (requires auth)
modelsRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = req.params["id"]!
    await deleteModel(id)
    res.status(204).end()
  } catch (err) {
    handleError(err, res)
  }
})
