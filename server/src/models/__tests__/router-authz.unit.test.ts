import express from "express"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { anonymous, asAdmin, asUser, fakeAuth, withServer, type FakeSession } from "../../test/harness.js"

const listModels = vi.fn()
const uploadModel = vi.fn()
const deleteModel = vi.fn()
const syncModels = vi.fn()

vi.mock("../service.js", () => ({
  listModels: (...args: unknown[]) => listModels(...args),
  uploadModel: (...args: unknown[]) => uploadModel(...args),
  deleteModel: (...args: unknown[]) => deleteModel(...args),
  syncModels: (...args: unknown[]) => syncModels(...args),
}))

const { modelsRouter } = await import("../router.js")

function appFor(session: FakeSession) {
  const app = express()
  app.use(express.json())
  fakeAuth(app, session)
  app.use("/api/models", modelsRouter)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
  listModels.mockResolvedValue([])
  uploadModel.mockResolvedValue({ id: "m1", name: "n", jsDelivrUrl: "u", fileSize: 1 })
  deleteModel.mockResolvedValue(undefined)
  syncModels.mockResolvedValue({ added: [], existing: 0 })
})

function multipartUpload(name = "model") {
  const boundary = "----sedativeboundary"
  const body =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${name}.glb"\r\n` +
    "Content-Type: model/gltf-binary\r\n\r\n" +
    "glTFbinarypayload\r\n" +
    `--${boundary}--\r\n`
  return {
    body,
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
  }
}

describe("models router authz (F-01)", () => {
  it("anonymous gets 401 on upload, sync and delete", async () => {
    const app = appFor(anonymous)
    const uploadReq = multipartUpload()
    const upload = await withServer(app, (baseUrl) =>
      fetch(`${baseUrl}/api/models/upload`, {
        method: "POST",
        headers: uploadReq.headers,
        body: uploadReq.body,
      }),
    )
    expect(upload.status).toBe(401)

    const sync = await withServer(app, (baseUrl) =>
      fetch(`${baseUrl}/api/models/sync`, { method: "POST" }),
    )
    expect(sync.status).toBe(401)

    const del = await withServer(app, (baseUrl) =>
      fetch(`${baseUrl}/api/models/abc`, { method: "DELETE" }),
    )
    expect(del.status).toBe(401)
  })

  it.fails("signed-in non-admin gets 403 and the service is never called", async () => {
    const app = appFor(asUser())
    const uploadReq = multipartUpload()
    const upload = await withServer(app, (baseUrl) =>
      fetch(`${baseUrl}/api/models/upload`, {
        method: "POST",
        headers: uploadReq.headers,
        body: uploadReq.body,
      }),
    )
    expect(upload.status).toBe(403)

    const sync = await withServer(app, (baseUrl) =>
      fetch(`${baseUrl}/api/models/sync`, { method: "POST" }),
    )
    expect(sync.status).toBe(403)

    const del = await withServer(app, (baseUrl) =>
      fetch(`${baseUrl}/api/models/abc`, { method: "DELETE" }),
    )
    expect(del.status).toBe(403)

    expect(uploadModel).not.toHaveBeenCalled()
    expect(syncModels).not.toHaveBeenCalled()
    expect(deleteModel).not.toHaveBeenCalled()
  })

  it("admin can upload, sync and delete", async () => {
    const app = appFor(asAdmin())
    const uploadReq = multipartUpload()
    const upload = await withServer(app, (baseUrl) =>
      fetch(`${baseUrl}/api/models/upload`, {
        method: "POST",
        headers: uploadReq.headers,
        body: uploadReq.body,
      }),
    )
    expect(upload.status).toBe(201)

    const sync = await withServer(app, (baseUrl) =>
      fetch(`${baseUrl}/api/models/sync`, { method: "POST" }),
    )
    expect(sync.status).toBe(200)
    expect(syncModels).toHaveBeenCalled()

    const del = await withServer(app, (baseUrl) =>
      fetch(`${baseUrl}/api/models/abc`, { method: "DELETE" }),
    )
    expect(del.status).toBe(204)
    expect(deleteModel).toHaveBeenCalledWith("abc")
  })

  it.fails("every non-GET route on modelsRouter is behind requireRole", () => {
    const layers = ((modelsRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> }).stack ?? [])
      .filter((l) => l.route)
      .map((l) => l.route!)
    const nonGet = layers.filter((r) => Object.keys(r.methods).some((m) => m !== "get"))
    expect(nonGet.length).toBeGreaterThan(0)
    for (const route of nonGet) {
      const names = route.stack.map((s) => s.handle.name)
      expect(names).toContain("requireRole")
    }
  })

  it.fails("upload is rate limited per user", async () => {
    const app = appFor(asAdmin())
    await withServer(app, async (baseUrl) => {
      let lastStatus = 0
      for (let i = 0; i < 11; i++) {
        const req = multipartUpload(`model-${i}`)
        const res = await fetch(`${baseUrl}/api/models/upload`, {
          method: "POST",
          headers: req.headers,
          body: req.body,
        })
        lastStatus = res.status
      }
      expect(lastStatus).toBe(429)
    })
  })
})
