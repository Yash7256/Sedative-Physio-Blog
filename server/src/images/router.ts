import { createHash } from "node:crypto"
import { Router } from "express"
import sharp from "sharp"

import { createLimiter } from "../lib/rate-limit.js"
import { safeFetchImage, UnsafeImageError } from "../lib/safe-fetch.js"

export const imagesRouter = Router()

const MAX_UPSTREAM_BYTES = 10 * 1024 * 1024
const MAX_OUTPUT_BYTES = 25 * 1024 * 1024
const MAX_INPUT_PIXELS = 40_000_000
const WEBP_QUALITY = 80

const imagesLimiter = createLimiter({
  prefix: "images",
  windowMs: 60 * 1000,
  limit: 120,
  message: { error: "Too many image requests. Please try again later." },
})

/**
 * GET /api/images?src=<https url>
 *
 * Fetches an allowlisted remote image and returns it re-encoded as WebP so the
 * site only ever renders WebP. Source URLs are validated by lib/safe-fetch;
 * same-origin paths are deliberately not accepted here.
 */
imagesRouter.get("/", imagesLimiter, async (req, res) => {
  const src = typeof req.query["src"] === "string" ? req.query["src"] : ""
  if (!src || src.length > 512) {
    res.status(400).json({ error: "Missing or invalid image source" })
    return
  }

  try {
    const bytes = await safeFetchImage(src, {
      maxBytes: MAX_UPSTREAM_BYTES,
      env: process.env,
    })

    if (bytes.byteLength > MAX_UPSTREAM_BYTES) {
      res.status(413).json({ error: "Source image is too large" })
      return
    }

    const output = await sharp(Buffer.from(bytes), { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate() // bake EXIF orientation
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer()

    if (output.byteLength > MAX_OUTPUT_BYTES) {
      res.status(413).json({ error: "Encoded image is too large" })
      return
    }

    const etag = `W/"${createHash("sha256").update(output).digest("base64url")}"`
    // Declared before the 304 return so a revalidation carries the same policy
    // as the 200 it refreshes, instead of inheriting the global `no-store`.
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
    res.setHeader("ETag", etag)
    if (req.headers["if-none-match"] === etag) {
      res.status(304)
      res.end()
      return
    }

    res.setHeader("Content-Type", "image/webp")
    res.status(200)
    res.send(output)
  } catch (err) {
    if (res.headersSent) {
      res.destroy()
      return
    }
    if (err instanceof UnsafeImageError) {
      res.status(400).json({ error: "Invalid image source" })
      return
    }
    console.error("Image conversion failed:", err instanceof Error ? err.name : "Unknown error")
    res.status(502).json({ error: "Could not convert the source image" })
  }
})
