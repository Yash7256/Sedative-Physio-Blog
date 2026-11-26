import { vi } from "vitest"

interface Entry {
  value: number
  expireAt: number
}

/** Small in-memory stand-in for the Upstash subset used by the shared store. */
export function createFakeRedis() {
  const data = new Map<string, Entry>()
  const now = () => Date.now()

  const multi = () => {
    const ops: Array<() => unknown> = []
    const chain = {
      incr(key: string) {
        ops.push(() => {
          const current = data.get(key)
          const active = current && current.expireAt > now() ? current.value : 0
          const next = active + 1
          data.set(key, { value: next, expireAt: current?.expireAt ?? 0 })
          return next
        })
        return chain
      },
      pttl(key: string) {
        ops.push(() => {
          const current = data.get(key)
          if (!current) return -2
          const ttl = current.expireAt - now()
          return ttl > 0 ? ttl : -1
        })
        return chain
      },
      async exec() {
        return ops.map((op) => op())
      },
    }
    return chain
  }

  const redis = {
    get: vi.fn(async (key: string) => data.get(key)?.value !== undefined ? String(data.get(key)!.value) : null),
    incr: vi.fn(async (key: string) => {
      const current = data.get(key)
      const active = current && current.expireAt > now() ? current.value : 0
      const next = active + 1
      data.set(key, { value: next, expireAt: current?.expireAt ?? 0 })
      return next
    }),
    multi,
    pexpire: vi.fn(async (key: string, ms: number) => {
      const current = data.get(key)
      if (current) current.expireAt = now() + ms
    }),
    decr: vi.fn(async (key: string) => {
      const current = data.get(key)
      if (current) current.value = Math.max(0, current.value - 1)
    }),
    del: vi.fn(async (key: string) => {
      data.delete(key)
    }),
  }

  return { data, redis }
}
