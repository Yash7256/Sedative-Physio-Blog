import type { Server } from "node:http"
import type { Express, RequestHandler } from "express"

export type FakeSession =
  | null
  | {
      userId: string
      sessionClaims?: { metadata?: Record<string, unknown> }
    }

export const anonymous: FakeSession = null

export function asUser(id = "user_test"): FakeSession {
  return { userId: id, sessionClaims: { metadata: {} } }
}

export function fakeAuth(app: Express, session: FakeSession): void {
  const middleware: RequestHandler = (req, _res, next) => {
    ;(req as unknown as { auth: () => unknown }).auth = () => session
    next()
  }
  app.use(middleware)
}

export async function withServer<T>(
  app: Express,
  fn: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const server: Server = app.listen(0, "127.0.0.1")
  await new Promise<void>((resolve) => server.once("listening", () => resolve()))
  const address = server.address()
  if (address === null || typeof address === "string") {
    throw new Error("Test server did not bind to a TCP port")
  }
  try {
    return await fn(`http://127.0.0.1:${address.port}`)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  }
}
