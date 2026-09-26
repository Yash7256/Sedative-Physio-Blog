/**
 * Vercel builds api/index.ts with @vercel/node and installs only the ROOT
 * package.json into /var/task/node_modules. api/index.ts imports
 * ../server/src/app.js, so every bare import reachable from it must resolve
 * from the root node_modules — a dependency declared only in
 * server/package.json resolves locally but 500s in production with
 * ERR_MODULE_NOT_FOUND.
 *
 * Run: node scripts/check-deploy-deps.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { builtinModules } from "node:module"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const ENTRY = join(ROOT, "api", "index.ts")

const BUILTIN = /^node:/
const BUILTIN_SET = new Set(builtinModules)
const EXTS = [".ts", ".js", ".mjs", ".cjs", ".json"]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "generated" || entry.name === "dist") continue
      walk(full, out)
    } else if (/\.(ts|js|mjs|cjs)$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)/g

function specifiersOf(file) {
  const src = readFileSync(file, "utf8")
  const found = new Set()
  for (const m of src.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2]
    if (spec) found.add(spec)
  }
  return [...found]
}

const missing = new Map()
const seen = new Set()

// Compare against the packages the root manifest *declares*, not against what
// happens to be resolvable on this machine: a hoisted copy, a leftover in
// node_modules, or a parent-directory install would otherwise mask the bug.
const rootPkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"))
const declared = new Set([
  ...Object.keys(rootPkg.dependencies ?? {}),
  ...Object.keys(rootPkg.devDependencies ?? {}),
  ...Object.keys(rootPkg.optionalDependencies ?? {}),
])

function visit(file) {
  if (seen.has(file) || !existsSync(file)) return
  seen.add(file)

  for (const spec of specifiersOf(file)) {
    if (BUILTIN.test(spec)) continue

    if (spec.startsWith(".") || spec.startsWith("/")) {
      const base = resolve(dirname(file), spec)
      // TS ESM convention: sources import "./x.js" but the file on disk is x.ts.
      const rewritten = spec.endsWith(".js")
        ? spec.replace(/\.js$/, ".ts")
        : spec.endsWith(".mjs")
          ? spec.replace(/\.mjs$/, ".mts")
          : spec.endsWith(".cjs")
            ? spec.replace(/\.cjs$/, ".cts")
            : null
      const candidates = [base, ...EXTS.map((e) => base + e)]
      if (rewritten) {
        const rbase = resolve(dirname(file), rewritten)
        candidates.unshift(rbase, ...EXTS.map((e) => rbase + e))
      }
      const target = candidates.find((p) => existsSync(p) && statSync(p).isFile())
      if (target) visit(target)
      continue
    }

    const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]
    if (declared.has(pkg)) continue
    // Bare built-ins ("crypto", "path") are provided by the runtime, not npm.
    if (BUILTIN_SET.has(pkg)) continue
    if (!missing.has(pkg)) missing.set(pkg, file)
  }
}

visit(ENTRY)

if (missing.size === 0) {
  console.log(
    `All ${declared.size} root-declared packages cover every external import reachable from api/index.ts (${seen.size} files walked).`,
  )
  process.exit(0)
}

console.error("These packages are imported by the deployed server but are NOT declared in the root package.json:")
console.error("Vercel installs only the root package.json, so each throws ERR_MODULE_NOT_FOUND in production:\n")
for (const [pkg, file] of [...missing].sort()) {
  console.error(`  ${pkg.padEnd(24)} first imported by ${file.replace(`${ROOT}/`, "")}`)
}
console.error("\nAdd them to the root package.json dependencies (keeping server/package.json in sync).")
process.exit(1)
