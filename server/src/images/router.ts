import { createHash } from "node:crypto"
import { Router } from "express"
import sharp from "sharp"

export const imagesRouter = Router()

const MAX_UPSTREAM_BYTES = 25 * 1024 * 1024 // refuse to buffer giant sources
const MAX_OUTPUT_BYTES = 25 * 1024 * 1024
const WEBP_QUALITY = 80

/**
 * GET /api/images?src=<url>
 *
 * Fetches any image (remote URL or same-origin path) and returns it re-encoded
 * as WebP so the site only ever renders WebP regardless of the stored format.
 * Output is content-addressed by (src), so it is cached immutably at the edge.
 */
imagesRouter.get("/", async (req, res) => {
  const src = typeof req.query["src"] === "string" ? req.query["src"] : ""
  if (!src || src.length > 512) {
    res.status(400).json({ error: "Missing or invalid image source" })
    return
  }

  let absolute: string
  if (/^https?:\/\//i.test(src)) {
    absolute = src
  } else if (src.startsWith("/") && !src.startsWith("//")) {
    const host = req.get("host")
    if (!host) {
      res.status(400).json({ error: "Missing host header" })
      return
    }
    absolute = `${req.protocol}://${host}${src}`
  } else {
    res.status(400).json({ error: "Only http(s) URLs and same-origin paths are allowed" })
    return
  }

  try {
    const upstream = await fetch(absolute, {
      redirect: "follow",
      headers: {
        "user-agent": "SedativePhysioImageConverter/1.0",
        accept: "image/*",
      },
    })
    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ error: "Could not fetch the source image" })
      return
    }

    const contentLength = Number(upstream.headers.get("content-length") ?? 0)
    if (contentLength > MAX_UPSTREAM_BYTES) {
      res.status(413).json({ error: "Source image is too large" })
      return
    }

    const buffer = Buffer.from(await upstream.arrayBuffer())
    if (buffer.byteLength > MAX_UPSTREAM_BYTES) {
      res.status(413).json({ error: "Source image is too large" })
      return
    }

    const output = await sharp(buffer)
      .rotate() // bake EXIF orientation
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer()

    if (output.byteLength > MAX_OUTPUT_BYTES) {
      res.status(413).json({ error: "Encoded image is too large" })
      return
    }

    const etag = `W/"${createHash("sha256").update(output).digest("base64url")}"`
    if (req.headers["if-none-match"] === etag) {
      res.status(304)
      res.end()
      return
    }

    res.setHeader("Content-Type", "image/webp")
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
    res.setHeader("ETag", etag)
    res.status(200)
    res.send(output)
  } catch (err) {
    if (res.headersSent) {
      res.destroy()
      return
    }
    console.error("Image conversion failed:", err)
    res.status(502).json({ error: "Could not convert the source image" })
  }
})