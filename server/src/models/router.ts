import { Router } from "express"

import { CATALOG_CACHE_POLICY, catalogCache } from "../lib/catalog-cache.js"
import { handleError } from "../lib/errors.js"
import { catalogListLimiter } from "../lib/rate-limit.js"
import { parsePageRequest } from "../lib/pagination.js"
import { listModels } from "./service.js"

export const modelsRouter = Router()

// GET /api/models — list all uploaded 3D models
modelsRouter.get(
  "/",
  catalogCache.middleware({
    catalog: "models",
    policy: CATALOG_CACHE_POLICY,
    allowedParams: ["limit", "cursor"],
  }),
  catalogListLimiter,
  async (req, res) => {
    try {
      const page = await listModels(parsePageRequest(req.query))
      res.status(200).json(page)
    } catch (err) {
      handleError(err, res, req)
    }
  },
)
