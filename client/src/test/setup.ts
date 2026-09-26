// The `/vitest` entry is the one that extends vitest's `expect`. The package
// root assumes a global `expect` exists, which it does not here — vitest is
// configured without `globals: true`, so every assertion in the suite imports
// `expect` explicitly. Importing the root entry fails at setup with
// "expect is not defined" before any test runs.
import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// React Testing Library only registers its automatic unmount when it can see a
// global `afterEach`, which requires vitest's `globals: true`. This project
// deliberately leaves globals off, so without this every `render` from one test
// stays mounted into the next. A leftover tree keeps its effects live and reacts
// to later mock changes, which shows up as an unrelated test mysteriously
// failing on state it should never have been able to influence.
afterEach(() => {
  cleanup()
})
