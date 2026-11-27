import { Router, type RequestHandler } from "express"

import { requireAuth } from "../auth/middleware/require-auth.js"
import { readAuthUserId } from "../lib/clerk.js"
import {
  CATALOG_NAMES,
  catalogCache,
  catalogCacheTag,
  type CatalogCache,
  type CatalogName,
} from "../lib/catalog-cache.js"
import {
  BadRequestError,
  GatewayError,
  ServiceUnavailableError,
  handleError,
} from "../lib/errors.js"

/** Clerk owns identity; this is only an allowlist of Clerk user ids. */
export function isCacheAdmin(userId: string | null, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!userId) return false
  const allowed = (env.CACHE_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
  return allowed.includes(userId)
}

const requireCacheAdmin: RequestHandler = (req, res, next) => {
  if (!isCacheAdmin(readAuthUserId(req))) {
    res.status(403).json({ error: "Forbidden" })
    return
  }
  next()
}

class CachePurgeConfigError extends Error {
  statusCode = 503
  constructor() {
    super("CDN purge is not configured")
    this.name = "CachePurgeConfigError"
  }
}

function isCatalogName(value: unknown): value is CatalogName {
  return typeof value === "string" && (CATALOG_NAMES as readonly string[]).includes(value)
}

interface VercelPurgeConfig {
  token: string
  project: string
  teamId?: string
}

function vercelPurgeConfig(env: NodeJS.ProcessEnv): VercelPurgeConfig | null {
  const token = env.VERCEL_ACCESS_TOKEN ?? env.VERCEL_TOKEN
  const project = env.VERCEL_PROJECT_ID ?? env.VERCEL_PROJECT_NAME
  if (!token || !project) return null
  return { token, project, teamId: env.VERCEL_TEAM_ID || undefined }
}

/** Invalidate by stable tag: the version in the in-memory key is invisible to the CDN. */
export async function purgeVercelCache(
  catalogs: readonly CatalogName[],
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const config = vercelPurgeConfig(env)
  if (!config) throw new CachePurgeConfigError()

  const url = new URL("https://api.vercel.com/v1/edge-cache/invalidate-by-tags")
  url.searchParams.set("projectIdOrName", config.project)
  if (config.teamId) url.searchParams.set("teamId", config.teamId)

  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tags: catalogs.map(catalogCacheTag),
      // Preview deployments must purge their own edge cache, not production's.
      target: env.VERCEL_ENV === "preview" ? "preview" : "production",
    }),
  })

  if (!response.ok) throw new GatewayError(`CDN purge failed (${response.status})`)
}

export interface CacheRouterOptions {
  cache: CatalogCache
  purge?: (catalogs: readonly CatalogName[]) => Promise<void>
}

export function createCacheRouter(options: CacheRouterOptions): Router {
  const router = Router()
  const purge = options.purge ?? purgeVercelCache

  router.post("/purge", requireAuth, requireCacheAdmin, async (req, res) => {
    try {
      const raw = req.body?.["catalogs"]
      let catalogs: CatalogName[]
      if (raw === undefined || raw === null || raw === "") {
        catalogs = [...CATALOG_NAMES]
      } else if (Array.isArray(raw) && raw.length > 0 && raw.every(isCatalogName)) {
        catalogs = [...new Set(raw)]
      } else {
        throw new BadRequestError("Unknown catalog")
      }

      // Fail before touching the CDN when the shared version store is absent.
      if (!options.cache.versionStoreReady()) {
        throw new ServiceUnavailableError("Catalog version store unavailable")
      }

      // Purge first: if the CDN call fails, leave the old version in place so a
      // retry cannot silently serve a half-invalidated catalogue.
      try {
        await purge(catalogs)
      } catch (err) {
        if (err instanceof CachePurgeConfigError || err instanceof GatewayError) throw err
        throw new GatewayError("CDN purge failed")
      }

      try {
        await options.cache.bumpShared(catalogs)
      } catch {
        throw new ServiceUnavailableError("Catalog version store unavailable")
      }
      res.json({ purged: catalogs, cdn: "purged" })
    } catch (err) {
      handleError(err, res, req)
    }
  })

  return router
}

export const cacheRouter = createCacheRouter({ cache: catalogCache })
