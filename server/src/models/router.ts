import { Router } from "express"

import { cacheControl } from "../lib/cache.js"
import { handleError } from "../lib/errors.js"
import { listModels } from "./service.js"

export const modelsRouter = Router()

// GET /api/models — list all uploaded 3D models
modelsRouter.get("/", cacheControl({ browser: 60, cdn: 300, swr: 86400 }), async (_req, res) => {
  try {
    const models = await listModels()
    res.status(200).json(models)
  } catch (err) {
    handleError(err, res)
  }
})
