import express from "express"
import { describe, expect, it, vi } from "vitest"

import { requireAuth } from "../middleware/require-auth.js"
import { anonymous, asUser, fakeAuth, withServer, type FakeSession } from "../../test/harness.js"

async function probe(session: FakeSession) {
  const app = express()
  fakeAuth(app, session)
  app.get("/probe", requireAuth, (_req, res) => {
    res.status(200).json({ ok: true })
  })
  return withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/probe`)
    return { response, body: await response.json() }
  })
}

describe("requireAuth", () => {
  it("rejects an anonymous request with 401", async () => {
    const { response, body } = await probe(anonymous)
    expect(response.status).toBe(401)
    expect(body).toEqual({ error: "Unauthorized" })
  })

  it("runs the handler for a signed-in user", async () => {
    const { response, body } = await probe(asUser())
    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true })
  })

  it("rejects a session with no userId", async () => {
    const { response } = await probe(null)
    expect(response.status).toBe(401)
  })

  it("rejects a request with no auth function at all", async () => {
    const app = express()
    app.get("/probe", requireAuth, (_req, res) => {
      res.status(200).json({ ok: true })
    })
    const response = await withServer(app, (baseUrl) => fetch(`${baseUrl}/probe`))
    expect(response.status).toBe(401)
  })

  it("does not call next after rejecting", async () => {
    const next = vi.fn()
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }
    requireAuth({} as never, res as never, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })
})
