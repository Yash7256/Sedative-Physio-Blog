import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

const here = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(here, "../..")

function readManifest(path) {
  return JSON.parse(readFileSync(resolve(rootDir, path), "utf8"))
}

const root = readManifest("package.json")
const server = readManifest("server/package.json")
const removed = ["multer", "@types/multer", "argon2", "jose"]

test("root and server declare the same runtime dependencies", () => {
  assert.deepEqual(root.dependencies, server.dependencies)
})

test("unused packages are absent from both manifests", () => {
  for (const name of removed) {
    assert.equal(root.dependencies?.[name], undefined, `${name} remains in root dependencies`)
    assert.equal(root.devDependencies?.[name], undefined, `${name} remains in root devDependencies`)
    assert.equal(server.dependencies?.[name], undefined, `${name} remains in server dependencies`)
    assert.equal(server.devDependencies?.[name], undefined, `${name} remains in server devDependencies`)
  }
})

test("high-severity advisory remediations are pinned consistently", () => {
  assert.equal(root.dependencies?.nodemailer, "^10.6.1")
  assert.equal(server.dependencies?.nodemailer, "^10.6.1")
  assert.equal(root.overrides?.effect, "3.22.5")
  assert.equal(server.overrides?.effect, "3.22.5")
})
