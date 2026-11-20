import express from "express"
import { describe, expect, it } from "vitest"

import { requireAuth } from "../middleware/require-auth.js"
import { requireRole } from "../middleware/require-role.js"
import { anonymous, asAdmin, asUser, fakeAuth, withServer, type FakeSession } from "../../test/harness.js"

async function probe(session: FakeSession, role = "admin") {
  const app = express()
  fakeAuth(app, session)
  app.get("/probe", requireAuth, requireRole(role), (_req, res) => {
    res.status(200).json({ ok: true })
  })
  return withServer(app, (baseUrl) => fetch(`${baseUrl}/probe`))
}

describe("requireRole", () => {
  it("returns 401 for an anonymous request", async () => {
    expect((await probe(anonymous)).status).toBe(401)
  })

  it("returns 403 for a signed-in user without the role", async () => {
    const response = await probe(asUser())
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: "Forbidden" })
  })

  it("runs the handler for a user with the role", async () => {
    const response = await probe(asAdmin())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it("checks the exact role value", async () => {
    const userSession: FakeSession = { userId: "user_1", sessionClaims: { metadata: { role: "user" } } }
    expect((await probe(userSession, "user")).status).toBe(200)
    expect((await probe(asUser(), "user")).status).toBe(403)
    expect((await probe(asAdmin(), "ADMIN")).status).toBe(403)
  })

  it.each([
    ["empty string", { role: "" }],
    ["number", { role: 123 }],
    ["null", { role: null }],
    ["missing", {}],
  ])("fails closed for a %s claim", async (_label, metadata) => {
    const session: FakeSession = { userId: "user_bad", sessionClaims: { metadata } }
    expect((await probe(session)).status).toBe(403)
  })

  it("fails closed when the metadata claim is missing entirely", async () => {
    expect((await probe({ userId: "user_bad" })).status).toBe(403)
  })

  it("fails closed when metadata is not an object", async () => {
    const session = {
      userId: "user_bad",
      sessionClaims: { metadata: "admin" },
    } as unknown as FakeSession
    expect((await probe(session)).status).toBe(403)
  })
})
