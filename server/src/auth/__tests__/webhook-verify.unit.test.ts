import { describe, expect, it, afterEach } from "vitest"
import crypto from "node:crypto"

import {
  readFallbackName,
  readPrimaryEmail,
  readRole,
  verifyClerkEvent,
} from "../services/webhook-verify.js"
import type { ClerkUserData } from "../services/webhook-verify.js"
import { BadRequestError } from "../../lib/errors.js"

const originalSecret = process.env.CLERK_WEBHOOK_SECRET

afterEach(() => {
  if (originalSecret === undefined) delete process.env.CLERK_WEBHOOK_SECRET
  else process.env.CLERK_WEBHOOK_SECRET = originalSecret
})

describe("readPrimaryEmail", () => {
  const withEmails = (
    addresses: ClerkUserData["email_addresses"],
    primaryId: string | null | undefined,
  ): ClerkUserData => ({
    id: "user_1",
    email_addresses: addresses,
    primary_email_address_id: primaryId,
  })

  it("picks the address matching primary_email_address_id", () => {
    const result = readPrimaryEmail(
      withEmails(
        [
          { id: "idm_a", email_address: "alt@example.com" },
          { id: "idm_b", email_address: "Primary@Example.com" },
        ],
        "idm_b",
      ),
    )
    expect(result.email).toBe("primary@example.com")
  })

  it("marks emailVerifiedAt only when Clerk reports verified", () => {
    const verified = readPrimaryEmail(
      withEmails(
        [{ id: "idm_a", email_address: "a@b.com", verification: { status: "verified" } }],
        "idm_a",
      ),
    )
    expect(verified.emailVerifiedAt).toBeInstanceOf(Date)

    const statuses: Array<string | null | undefined> = [
      "unverified",
      "transfer_pending",
      null,
      undefined,
    ]
    for (const status of statuses) {
      const unverified = readPrimaryEmail(
        withEmails(
          [{ id: "idm_a", email_address: "a@b.com", verification: { status } }],
          "idm_a",
        ),
      )
      expect(unverified.emailVerifiedAt).toBeNull()
    }
  })

  it("demotes a previously verified address if Clerk stops reporting it verified", () => {
    // Guards against a stale verified badge surviving a domain revocation.
    const result = readPrimaryEmail(
      withEmails(
        [{ id: "idm_a", email_address: "a@b.com", verification: { status: "unverified" } }],
        "idm_a",
      ),
    )
    expect(result.emailVerifiedAt).toBeNull()
  })

  it("returns nulls for a phone-only account with no attached address", () => {
    expect(readPrimaryEmail(withEmails([], null))).toEqual({
      email: null,
      emailVerifiedAt: null,
    })
    expect(readPrimaryEmail(withEmails(undefined, undefined))).toEqual({
      email: null,
      emailVerifiedAt: null,
    })
  })

  it("falls back to the first address when no primary is set", () => {
    const result = readPrimaryEmail(
      withEmails([{ id: "idm_a", email_address: "Only@Example.com" }], null),
    )
    expect(result.email).toBe("only@example.com")
  })
})

describe("readFallbackName", () => {
  it("joins first and last name", () => {
    expect(readFallbackName({ id: "u", first_name: "Ada", last_name: "Lovelace" })).toBe(
      "Ada Lovelace",
    )
  })

  it("uses whichever part is present", () => {
    expect(readFallbackName({ id: "u", first_name: "Ada" })).toBe("Ada")
    expect(readFallbackName({ id: "u", last_name: "Lovelace" })).toBe("Lovelace")
  })

  it("returns null rather than empty or whitespace", () => {
    expect(readFallbackName({ id: "u", first_name: "  ", last_name: null })).toBeNull()
    expect(readFallbackName({ id: "u" })).toBeNull()
  })
})

describe("readRole", () => {
  it("reads a non-empty string role", () => {
    expect(readRole({ id: "u", public_metadata: { role: "admin" } })).toBe("admin")
  })

  it("returns null for anything that is not a usable string", () => {
    // A malformed role must fail closed, never fall back to something permissive.
    expect(readRole({ id: "u", public_metadata: {} })).toBeNull()
    expect(readRole({ id: "u", public_metadata: { role: "" } })).toBeNull()
    expect(readRole({ id: "u", public_metadata: { role: "   " } })).toBeNull()
    expect(readRole({ id: "u", public_metadata: { role: 42 } })).toBeNull()
    expect(readRole({ id: "u", public_metadata: { role: ["admin"] } })).toBeNull()
    expect(readRole({ id: "u", public_metadata: null })).toBeNull()
  })
})

describe("verifyClerkEvent", () => {
  /**
   * svix enforces a ~5 minute replay window, so a static captured signature
   * would start failing on its own. Signing here with a fresh timestamp keeps
   * the test deterministic and time-independent.
   */
  function sign(secret: string, payload: string) {
    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64")
    const id = "msg_test"
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signature =
      "v1," +
      crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest("base64")
    return { "svix-id": id, "svix-timestamp": timestamp, "svix-signature": signature }
  }

  const newSecret = () => "whsec_" + crypto.randomBytes(32).toString("base64")

  it("returns the parsed event for a valid signature", () => {
    const secret = newSecret()
    process.env.CLERK_WEBHOOK_SECRET = secret

    const payload = JSON.stringify({ type: "user.created", data: { id: "user_1" } })
    const event = verifyClerkEvent(payload, sign(secret, payload))

    expect(event.type).toBe("user.created")
    expect(event.data.id).toBe("user_1")
  })

  it("rejects a body that was altered after signing", () => {
    const secret = newSecret()
    process.env.CLERK_WEBHOOK_SECRET = secret

    const payload = JSON.stringify({ type: "user.created", data: { id: "user_1" } })
    const headers = sign(secret, payload)

    expect(() =>
      verifyClerkEvent(payload.replace("user_1", "user_2"), headers),
    ).toThrow(BadRequestError)
  })

  it("rejects a signature made with a different secret", () => {
    const payload = JSON.stringify({ type: "user.created", data: { id: "user_1" } })
    const headers = sign(newSecret(), payload)
    process.env.CLERK_WEBHOOK_SECRET = newSecret()

    expect(() => verifyClerkEvent(payload, headers)).toThrow(BadRequestError)
  })

  it("rejects missing svix headers instead of throwing a raw TypeError", () => {
    const secret = newSecret()
    process.env.CLERK_WEBHOOK_SECRET = secret
    const payload = "{}"

    expect(() => verifyClerkEvent(payload, {})).toThrow(BadRequestError)
  })

  it("fails loudly when CLERK_WEBHOOK_SECRET is unset", () => {
    delete process.env.CLERK_WEBHOOK_SECRET
    // A misconfigured deployment must be obvious, not silently skip verification.
    expect(() => verifyClerkEvent("{}", {})).toThrow(/CLERK_WEBHOOK_SECRET/)
  })

  it("rejects an authenticated body that is not valid JSON", () => {
    const secret = newSecret()
    process.env.CLERK_WEBHOOK_SECRET = secret

    const payload = "not json at all"
    const headers = sign(secret, payload)

    // Correctly signed, so it passes authentication — and still must not 500.
    expect(() => verifyClerkEvent(payload, headers)).toThrow(/Malformed webhook payload/)
  })

  it("verifies before parsing, so an unsigned body never reaches JSON.parse", () => {
    const secret = newSecret()
    process.env.CLERK_WEBHOOK_SECRET = secret

    // Signature is wrong AND the body is not JSON. If parsing happened first
    // this would report "malformed" and leak that the body was never checked.
    expect(() => verifyClerkEvent("{ not json", sign(newSecret(), "{}"))).toThrow(
      /Invalid webhook signature/,
    )
  })
})
