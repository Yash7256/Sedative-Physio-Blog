import { Router } from "express"

import { cacheControl } from "../lib/cache.js"
import { handleError } from "../lib/errors.js"
import { parsePageRequest } from "../lib/pagination.js"
import { listModels } from "./service.js"

export const modelsRouter = Router()

// GET /api/models — list all uploaded 3D models
modelsRouter.get("/", cacheControl({ browser: 60, cdn: 300, swr: 86400 }), async (req, res) => {
  try {
    const page = await listModels(parsePageRequest(req.query))
    res.status(200).json(page)
  } catch (err) {
    handleError(err, res)
  }
})
