/**
 * Build-time WebP converter.
 *
 * Walks client/public and writes a `.webp` next to every raster image
 * (png/jpg/jpeg/gif/bmp/tiff), so the site can render WebP for all local
 * images without any runtime cost. Idempotent: skips files whose `.webp`
 * output is already newer than the source.
 *
 * Runs automatically before `vite build` and `vite dev` (see client scripts).
 */

import { existsSync, readdirSync, statSync } from "node:fs"
import { dirname, extname, join } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const PUBLIC_DIR = join(REPO_ROOT, "public")
const RASTER_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".tif"])

function walk(dir) {
  const found = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...walk(full))
    else if (entry.isFile() && RASTER_EXT.has(extname(entry.name).toLowerCase())) found.push(full)
  }
  return found
}

async function main() {
  const files = walk(PUBLIC_DIR)
  let converted = 0
  let skipped = 0
  for (const file of files) {
    const ext = extname(file).toLowerCase()
    const webp = file.slice(0, -ext.length) + ".webp"
    const srcTime = statSync(file).mtimeMs
    if (existsSync(webp) && statSync(webp).mtimeMs >= srcTime) {
      skipped++
      continue
    }
    await sharp(file).rotate().webp({ quality: 80 }).toFile(webp)
    converted++
    console.log(`[webp] ${webp.replace(`${PUBLIC_DIR}/`, "")}`)
  }
  console.log(`WebP conversion done: ${converted} converted, ${skipped} up to date.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})