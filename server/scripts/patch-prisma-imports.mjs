import { readdir, readFile, writeFile } from "node:fs/promises"
import { join, extname, relative } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../generated/prisma", import.meta.url))

const VALID_EXT = /\.(m?js|ts|json|node)(\?|$)/

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else if (extname(entry.name) === ".ts") files.push(full)
  }
  return files
}

const specifierRe = /(from\s+|import\s+)(["'])(\.\.?\/[^"']*)(["'])/g

async function patch(file) {
  const source = await readFile(file, "utf8")
  let changed = false
  const patched = source.replace(specifierRe, (match, prefix, open, spec, close) => {
    if (VALID_EXT.test(spec)) return match
    changed = true
    return `${prefix}${open}${spec}.js${close}`
  })
  if (changed) {
    await writeFile(file, patched)
    return relative(fileURLToPath(new URL("..", import.meta.url)), file)
  }
  return null
}

const files = await walk(root)
const modified = (await Promise.all(files.map(patch))).filter(Boolean)
console.log(`Patched ${modified.length} generated file(s):`)
for (const file of modified) console.log(`  ${file}`)