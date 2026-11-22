// The `/vitest` entry is the one that extends vitest's `expect`. The package
// root assumes a global `expect` exists, which it does not here — vitest is
// configured without `globals: true`, so every assertion in the suite imports
// `expect` explicitly. Importing the root entry fails at setup with
// "expect is not defined" before any test runs.
import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// jsdom 30 does not expose `localStorage` unless a non-opaque origin is
// configured. Components read it in effects, so give the suite a tiny
// in-memory implementation before any test module is imported.
if (typeof globalThis.localStorage === "undefined") {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, String(value)),
      removeItem: (key: string) => void values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size
      },
    },
  })
}

// React Testing Library only registers its automatic unmount when it can see a
// global `afterEach`, which requires vitest's `globals: true`. This project
// deliberately leaves globals off, so without this every `render` from one test
// stays mounted into the next. A leftover tree keeps its effects live and reacts
// to later mock changes, which shows up as an unrelated test mysteriously
// failing on state it should never have been able to influence.
afterEach(() => {
  cleanup()
})
