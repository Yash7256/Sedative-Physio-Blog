import { describe, expect, it, afterEach } from "vitest"
import crypto from "node:crypto"

import {
  classifyClerkEvent,
  readFallbackName,
  readPrimaryEmail,
  verifyClerkEvent,
  type ClerkEvent,
} from "../services/webhook-verify.js"
import type { ClerkUserData } from "../services/webhook-verify.js"
import { BadRequestError } from "../../lib/errors.js"
import { FULL_NAME_MAX_LENGTH } from "../constants.js"

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

  it("reports verified only when Clerk reports verified", () => {
    const verified = readPrimaryEmail(
      withEmails(
        [{ id: "idm_a", email_address: "a@b.com", verification: { status: "verified" } }],
        "idm_a",
      ),
    )
    expect(verified.verified).toBe(true)

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
      expect(unverified.verified).toBe(false)
    }
  })

  it("reports unverified if Clerk stops reporting it verified", () => {
    const result = readPrimaryEmail(
      withEmails(
        [{ id: "idm_a", email_address: "a@b.com", verification: { status: "unverified" } }],
        "idm_a",
      ),
    )
    expect(result.verified).toBe(false)
  })

  it("returns null email and unverified for a phone-only account with no attached address", () => {
    expect(readPrimaryEmail(withEmails([], null))).toEqual({
      email: null,
      verified: false,
    })
    expect(readPrimaryEmail(withEmails(undefined, undefined))).toEqual({
      email: null,
      verified: false,
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


describe("readPrimaryEmail: malformed input", () => {
  it("returns nulls rather than throwing on an unusable address", () => {
    // The exact TypeError this replaced: `null.toLowerCase()` on a signed but
    // malformed delivery surfaced as a 500 and a Clerk retry loop.
    const cases = [
      [{ id: "e1", email_address: null }],
      [{ id: "e1" }],
      [{ id: "e1", email_address: "" }],
      "a@b.com",
      42,
    ]
    for (const email_addresses of cases) {
      expect(
        readPrimaryEmail({ id: "u1", email_addresses } as never).email,
      ).toBeNull()
    }
  })
})

describe("readFallbackName: length", () => {
  it("caps the joined name, not just each part", () => {
    const name = readFallbackName({
      id: "u1",
      first_name: "a".repeat(FULL_NAME_MAX_LENGTH),
      last_name: "b".repeat(FULL_NAME_MAX_LENGTH),
    })
    expect(name).toHaveLength(FULL_NAME_MAX_LENGTH)
  })
})

describe("classifyClerkEvent: identity", () => {
  const upsert = (data: unknown): ClerkEvent =>
    classifyClerkEvent({ type: "user.created", data })

  it("accepts a well-formed user.created", () => {
    const event = upsert({ id: "user_2abc" })
    expect(event.kind).toBe("upsert")
    if (event.kind === "upsert") expect(event.eventType).toBe("user.created")
  })

  it("accepts a well-formed user.updated", () => {
    const event = classifyClerkEvent({ type: "user.updated", data: { id: "user_2abc" } })
    expect(event.kind).toBe("upsert")
    if (event.kind === "upsert") expect(event.eventType).toBe("user.updated")
  })

  it("ignores a payload that is not an object", () => {
    expect(classifyClerkEvent(null).kind).toBe("ignore")
    expect(classifyClerkEvent("user.created").kind).toBe("ignore")
    expect(classifyClerkEvent([{ type: "user.created" }]).kind).toBe("ignore")
  })

  it("ignores an event with no usable type", () => {
    expect(classifyClerkEvent({ data: { id: "user_2abc" } }).kind).toBe("ignore")
    expect(classifyClerkEvent({ type: "", data: {} }).kind).toBe("ignore")
    expect(classifyClerkEvent({ type: 7, data: {} }).kind).toBe("ignore")
  })

  it("ignores an unhandled type rather than guessing", () => {
    expect(classifyClerkEvent({ type: "session.created", data: { id: "s_1" } }).kind).toBe("ignore")
  })

  // The regression that mattered: with `id` undefined, Prisma omits the filter
  // and findFirst matches an arbitrary row, so a malformed `user.deleted`
  // would have anonymised whoever happened to be first in the table.
  it("never yields a delete without a usable id", () => {
    for (const data of [undefined, null, {}, { id: null }, { id: "" }, { id: "   " }, { id: 42 }]) {
      expect(classifyClerkEvent({ type: "user.deleted", data }).kind).toBe("ignore")
    }
  })

  it("never yields an upsert without a usable id", () => {
    for (const data of [undefined, null, {}, { id: null }, { id: "" }]) {
      expect(upsert(data).kind).toBe("ignore")
    }
  })

  it("rejects an id beyond the mirrored length", () => {
    expect(upsert({ id: "u".repeat(129) }).kind).toBe("ignore")
    expect(upsert({ id: "u".repeat(128) }).kind).toBe("upsert")
  })
})

describe("classifyClerkEvent: field normalisation", () => {
  it("drops addresses that are not usable strings", () => {
    const event = classifyClerkEvent({
      type: "user.created",
      data: {
        id: "user_2abc",
        email_addresses: [
          { id: "e1", email_address: "real@example.com" },
          { id: "e2", email_address: null },
          { id: "e3" },
          null,
          "nope",
          { id: "e4", email_address: "not-an-email" },
        ],
      },
    })
    if (event.kind !== "upsert") throw new Error("expected upsert")
    expect(event.data.email_addresses).toEqual([
      { id: "e1", email_address: "real@example.com", verification: null },
    ])
  })

  it("reports no addresses rather than a list of blanks", () => {
    const event = classifyClerkEvent({
      type: "user.created",
      data: { id: "user_2abc", email_addresses: [{ id: "e1" }] },
    })
    if (event.kind !== "upsert") throw new Error("expected upsert")
    expect(event.data.email_addresses).toBeNull()
  })

  it("discards a non-array address list", () => {
    const event = classifyClerkEvent({
      type: "user.created",
      data: { id: "user_2abc", email_addresses: "a@b.com" },
    })
    if (event.kind !== "upsert") throw new Error("expected upsert")
    expect(event.data.email_addresses).toBeNull()
  })

  it("keeps only object metadata", () => {
    const asString = classifyClerkEvent({
      type: "user.created",
      data: { id: "u1", public_metadata: "not-an-object" },
    })
    if (asString.kind !== "upsert") throw new Error("expected upsert")
    expect(asString.data.public_metadata).toBeNull()

    const asObject = classifyClerkEvent({
      type: "user.created",
      data: { id: "u1", public_metadata: { plan: "pro" } },
    })
    if (asObject.kind !== "upsert") throw new Error("expected upsert")
    expect(asObject.data.public_metadata).toEqual({ plan: "pro" })
  })

  it("coerces wrongly typed names to null instead of passing them on", () => {
    const event = classifyClerkEvent({
      type: "user.created",
      data: { id: "u1", first_name: 99, last_name: { a: 1 } },
    })
    if (event.kind !== "upsert") throw new Error("expected upsert")
    expect(event.data.first_name).toBeNull()
    expect(event.data.last_name).toBeNull()
  })
})
