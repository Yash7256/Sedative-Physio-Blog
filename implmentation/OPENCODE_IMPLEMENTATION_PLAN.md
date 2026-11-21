# Auth Hardening: Implementation Plan for opencode

**Repo:** `github.com/Yash7256/Sedative-Physio-Blog`  **Baseline:** `main` @ `e047078c` (20 Nov 2026)
**Based on:** the round-2 authentication audit (14 findings, numbered #1 to #14 below).
**Relationship to older docs:** this plan **replaces Part C** of `implmentation/Auth.md`. Parts A and B of that file are still the design reference, **except** everything about an admin role, `requireRole`, model upload/sync/delete and the GitHub PAT, which no longer exist on `main`.

> **Canonical path:** `implmentation/OPENCODE_IMPLEMENTATION_PLAN.md` (this file). The custom commands in Appendix C point at this path. `implmentation/` is the directory spelling already used by `Auth.md`; keep it consistent.

---

## 0. Working with opencode

### 0.1 The loop (repeat for every phase)

1. **New session per phase.** Start `opencode` in the repo root on a clean branch cut from `main`.
2. **`/phase P2`** (command from Appendix C). It runs in the read-only **plan** agent and must answer with: files it will touch, the tests it will write first, and its risks. It edits nothing.
3. **You approve or correct the plan**, then switch to the **build** agent (Tab).
4. **Tests first.** Write the failing test, run it, see it fail for the right reason, implement, see it pass.
5. **`/verify`** runs the typecheck, lint and test gates and reports.
6. **`/review`** hands the diff to the read-only `auth-reviewer` subagent, which checks it against this plan's acceptance criteria.
7. **You push and open the PR** (opencode is configured so it cannot push). Merge when CI is green.
8. If a session gets long or confused, **start a fresh session** and give it only: `AGENTS.md`, the phase section, and `git diff main...HEAD`. Use `/undo` for a bad edit.

### 0.2 One-time setup (`HUMAN`, before P1)

Create these files from Appendices A to D and commit them on their own branch (`sec/p0-opencode-setup`):

| File | Purpose |
|---|---|
| `opencode.json` | permissions: no `git push`, no `.env` reads, no migrations, no generated-client edits |
| `AGENTS.md` | standing rules opencode reads every session |
| `.opencode/commands/phase.md`, `verify.md`, `review.md` | the three slash commands |
| `.opencode/agents/auth-reviewer.md` | the read-only reviewer subagent |

Run `opencode --version` first. The snippets in the appendices follow **OpenCode V2** (`https://opencode.ai/docs`): `permissions` is an ordered array of `{action, resource, effect}` rules, and `subagent: true` is the current command field. If a field is rejected, check `https://opencode.ai/docs` and adjust rather than changing the intent (deny push, deny `.env`, deny migrations/generated-client edits).

### 0.3 Ground rules (also in `AGENTS.md`)

1. **One phase = one branch = one PR.** Branch names `sec/pN-<topic>`. Never mix phases.
2. **Tests first**, always. Paste red then green output into the PR description.
3. **The tests are the spec.** 37 `it.fails` call sites (41 runtime cases) already exist in the repo and define the exact interfaces for P3, P4 and P5 (see 0.5). Make them pass by changing `it.fails(` to `it(`; do not rewrite their assertions to fit your implementation. If a test seems wrong, stop and ask.
4. **Keep Clerk.** No custom credential, JWT or session code.
5. **No schema migrations and no edits under `server/generated/**`.** If you believe one is needed, stop and ask.
6. **No new dependencies** except those this plan names (`@upstash/redis` in P4).
7. **Never print or log secrets or PII.** Do not read `.env*` files.
8. **Fail closed.** Missing config, store errors on sensitive routes, unknown input: deny.
9. **Keep `package.json` (root) and `server/package.json` dependencies in sync**; run `npm run check:deploy` after any dependency change (Vercel installs from the root).
10. **Smallest diff that meets the acceptance criteria.** No drive-by refactors.

### 0.4 What opencode must never do (human-only)

Rotate or revoke keys, rewrite git history, push, change Clerk, Vercel, Razorpay, Upstash or GitHub settings, or run anything that touches a production database. These are the `HUMAN` tasks in P0.

### 0.5 The expected-fail tests and who owns them

Counts verified against `main` @ `e047078c` (all paths below are relative to `server/src/`). There are **37 `it.fails` call sites**, which generate **41 runtime cases** because one call in `safe-fetch.unit.test.ts` sits inside a 5-iteration loop. Both numbers are correct; use "call sites" when counting edits and "runtime cases" when reading Vitest output.

| Phase | Test files | `it.fails` call sites to flip | Runtime cases |
|---|---|---|---|
| **P3** | `auth/__tests__/profile-sync.unit.test.ts` (8), `auth/__tests__/webhook-order.unit.test.ts` (3) | 11 | 11 |
| **P4** | `auth/__tests__/config.unit.test.ts` (3), `lib/__tests__/rate-limit.unit.test.ts` (8), `auth/__tests__/app-clerk.unit.test.ts` (1) | 12 | 12 |
| **P5** | `lib/__tests__/safe-fetch.unit.test.ts` (12), `images/__tests__/router.unit.test.ts` (2) | 14 | 18 |

Do not invent extra tests to reach a different total — implement what the existing tests specify. A phase is not done while an `it.fails` it owns remains. P2, P6, P7 and P8 have no pre-written tests; they add their own.

### 0.6 Task legend

| Tag | Meaning |
|---|---|
| `CODE` | opencode does this |
| `HUMAN` | only the repo owner can do this |
| `MANUAL` | verified by a person in a real environment after deploy |

---

## 1. Findings map

| # | Sev | Finding | Earlier ID | Phase |
|---|---|---|---|---|
| 1 | 🟠 | Refunded order flips back to PAID (replayed `/verify`, late webhook) | new | **P2** |
| 2 | 🟠 | Secrets in git history on every branch | F-03 | **P0** (human) |
| 3 | 🟠 | Legacy profile adopted on an unverified email | F-02 | **P3** |
| 4 | 🟡 | Delete then re-register fails; "anonymise" keeps PII | F-04, F-05 | **P3** |
| 5 | 🟡 | Cookie-only auth, no `authorizedParties` | F-07 | **P4** |
| 6 | 🟡 | Rate limits are per-instance on serverless; many routes unlimited | F-08 | **P4** |
| 7 | 🟡 | Unauthenticated SSRF in `/api/images` | F-12 | **P5** |
| 8 | 🟡 | SPA has no CSP, frame-ancestors, HSTS or related headers | new | **P6** |
| 9 | 🟡 | 14 dependency advisories; unused `multer`, `argon2`, `jose` | F-11 | **P7** |
| 10 | 🟡 | No CI, secret scanning or audit gate | new | **P1** |
| 11 | 🔵 | No JSON error handler; stack traces when `NODE_ENV` is not production; webhook 500 on non-JSON | new | **P4** |
| 12 | 🔵 | Unique-violation on update swallowed silently | new | **P3** |
| 13 | 🔵 | Audit trail thin (`audit.ts` and `context.ts` unused, no IP/UA, `emailVerifiedAt` reset each sync) | F-09, F-10 | **P3**, **P8** |
| 14 | 🔵 | Config errors leak env var names; free/paid flag inconsistency; legacy null-user orders claimable; PII in logs; stale `GITHUB_*` | new | **P2**, **P8** |

---

## 2. Phase overview

| Phase | Theme | Findings | Size | Depends on | Deploy gate |
|---|---|---|---|---|---|
| **P0** | Human prerequisites and opencode setup | 2, 14 (PAT), config for 3, 5, 6 | M (human) | none | Blocks P4 and P5 deploys |
| **P1** | CI and guardrails | 10 | S | P0.2 setup | none |
| **P2** | Payments order state machine | 1, 14 | M | P1 | none (no migration) |
| **P3** | Identity sync (review and merge `auth/p3-identity-sync`) | 3, 4, 12, 13 | M | P1 | none |
| **P4** | Session origin, shared rate limits, error handling | 5, 6, 11 | L | P1 | Upstash env + `CLERK_AUTHORIZED_PARTIES` set |
| **P5** | SSRF-safe image proxy | 7 | M | P4 (uses `createLimiter`) | `IMAGE_PROXY_ALLOWED_HOSTS` reviewed |
| **P6** | SPA security headers | 8 | M | P1 | CSP runs report-only first |
| **P7** | Dependencies and dead code | 9 | M | P1 | none |
| **P8** | Audit trail, config hygiene, docs, final verification | 13, 14 | S | P2 to P7 | none |

**Recommended order:** P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8. P2 comes first because it is the one flaw that costs money without any special access. P3 to P7 are otherwise independent, except that P5 reuses P4's limiter.

---

# 3. PHASES

## PHASE 0: Human prerequisites (`HUMAN`)

opencode does none of this. Tick it off yourself; P4 and P5 cannot be *deployed* until the relevant items are done.

**P0.1 Rotate every secret that lived in `.env.local`** (finding 2). The history shows a Supabase service-role key and anon key, a Vercel OIDC token, and a Grok API key (commits `cbd5af03`, `c2cca441`, `d5d6a857`). If the Supabase project still exists, rotate its JWT secret or delete the project. Rotation is what actually protects you; rewriting history only limits future copying.

**P0.2 Purge history, before starting P1** so no phase branch has to be rebased afterwards:
```bash
pip install git-filter-repo
git clone --mirror git@github.com:Yash7256/Sedative-Physio-Blog.git repo.git && cd repo.git
git filter-repo --invert-paths --path .env.local --path-glob '*/node_modules/*' --path node_modules
git push --force --all && git push --force --tags
```
`.env.local` and a committed `node_modules` are in the history of `main`, `new-design`, `vercel/vercel-web-analytics-…` and the auth branches. After the push: ask GitHub Support to purge cached views and `refs/pull/*`, tell collaborators to **re-clone**, and run `gitleaks detect --log-opts="--all"` on a fresh clone. Start every later opencode session from that fresh clone.

**P0.3 Revoke the GitHub PAT** (`GITHUB_TOKEN`) and delete all `GITHUB_*` variables from Vercel. The code no longer uses them.

**P0.4 Vercel environment** (Production **and** Preview):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `CORS_ALLOWED_ORIGINS` | exact browser origins, no trailing slash, no `localhost` in Production |
| `CLERK_AUTHORIZED_PARTIES` | the same exact origins (scheme + host + port; `www` and apex are different) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | from P0.6 |
| `IMAGE_PROXY_ALLOWED_HOSTS` | `i.ibb.co,images.unsplash.com` plus anything P5 finds |

**P0.5 Clerk dashboard:** email required **and verified at sign-up**; webhook endpoint `/api/auth/webhooks/clerk` subscribed to `user.created`, `user.updated`, `user.deleted`; allowed redirect URLs limited to your real domains; bot/sign-up protection on; MFA available. Note your **Frontend API host** (for example `clerk.<your-domain>`); P6 needs it.

**P0.6 Create an Upstash Redis database** (REST). Set the two variables in P0.4.

**P0.7 GitHub settings:** protect `main` (require PR and passing CI, no force-push once P0.2 is done), enable secret scanning with push protection, enable Dependabot alerts.

**P0.8 Razorpay:** confirm the webhook is subscribed to `order.paid`, `payment.captured`, `payment.failed`, `refund.processed`. Decide D1 and D2 in section 5 (refund policy).

**P0.9 opencode:** install, run `opencode --version`, create the setup branch described in 0.2 and merge it.

---

## PHASE 1: CI and guardrails

**Branch:** `sec/p1-guardrails`  **Closes:** finding 10  **Agent:** plan → build
**Kickoff:** `/phase P1`

### Tasks (`CODE`)
1. **`.github/workflows/ci.yml`** with three jobs:
   - `server`: checkout, Node 22 with npm cache, `npm --prefix server ci --ignore-scripts`, then typecheck, lint, test, and `npm --prefix server audit --omit=dev --audit-level=critical`.
   - `client`: same pattern with `npm --prefix client run lint` and `npm --prefix client test`.
   - `secrets`: `gitleaks/gitleaks-action@v2` with `fetch-depth: 0`. This job is safe to enable now **only because P0.2 has removed the old secrets**.
   - Verify the install really works without `postinstall`. If `tsc` needs the generated Prisma client, run `node server/scripts/patch-prisma-imports.mjs` (or the minimal `prisma generate` that works offline) in the workflow instead of the full `postinstall`. Show the exact command that worked.
2. **Audit threshold:** block on `critical` now. The plan raises it to `high` in P7 once the advisories are fixed. Do not make CI red for advisories P7 will fix.
3. **`.github/dependabot.yml`:** weekly updates for `/`, `/server`, `/client` (npm) and GitHub Actions.
4. **`.gitleaks.toml`:** default rules, with an allowlist limited to obvious test fixtures (for example the dummy `whsec_…` string in tests). Allowlist by path and exact fixture value, never by wildcard rule.
5. **`.gitignore`:** keep `.env*`, add `!.env.example` and `!**/.env.example` so the templates stay trackable.
6. **CI runs `npm run check:deploy`** (root/server dependency sync).

### Acceptance
- CI is green on the PR; the `secrets` job passes.
- A deliberate throwaway commit containing a fake `sk_live_…` string on a scratch branch makes `secrets` fail (show the log, then delete the branch).
- `npm run check:deploy` runs in CI.

### Verify
```bash
npm --prefix server run typecheck && npm --prefix server run lint && npm --prefix server test
npm --prefix client run lint && npm --prefix client test && npm run check:deploy
```
**Rollback:** revert the PR (config files only).

---

## PHASE 2: Payments order state machine

**Branch:** `sec/p2-payments`  **Closes:** finding 1 and the payments parts of 14  **Agent:** plan → build
**Kickoff:** `/phase P2`  **No migration. No new dependency.**

### The flaw (reproduced in the audit)
`verifyRazorpayPayment` and the `order.paid` / `payment.captured` webhook branch only short-circuit on `status === "PAID"`. A `REFUNDED` order falls through, becomes `PAID` and its enrollments are recreated, either by the buyer replaying the saved `order_id`/`payment_id`/`signature`, or by a retried webhook arriving after `refund.processed`.

### Target state machine

| From | To | Allowed via |
|---|---|---|
| `PENDING` | `PAID` | `/verify`, `order.paid`, `payment.captured` |
| `PENDING` | `FAILED` | `payment.failed` |
| `FAILED` | `PAID` | same as above (Razorpay lets a failed order be retried) |
| `PAID` | `REFUNDED` | full `refund.processed` |
| `PAID` | `PAID` | idempotent re-verify (repairs missing enrollments only) |
| `REFUNDED` | anything | **never** (terminal) |

### Tasks (`CODE`), in this order
1. **Write the failing tests first** in `server/src/payments/__tests__/order-state.unit.test.ts` (see Tests). Reuse the Prisma mock pattern from `webhook.unit.test.ts`; extend the transaction mock with `order.updateMany`.
2. **`payments/service.ts`: one helper** `markOrderPaid(tx, order, fields)`:
   ```ts
   const { count } = await tx.order.updateMany({
     where: { id: order.id, status: { in: ["PENDING", "FAILED"] } },
     data: { status: "PAID", ...fields },
   })
   ```
   Create enrollments **only when `count === 1`**. If `count === 0`, re-read the status: `PAID` → idempotent success; `REFUNDED` → refuse.
3. **`verifyRazorpayPayment`:** on `REFUNDED` throw `ConflictError("This order was refunded.")` (409). On `PAID` keep the current idempotent enrollment upserts. Never touch a `REFUNDED` row.
4. **`processRazorpayWebhook`:** on `REFUNDED` return `{ received: true, processed: false, event }` and write no enrollments. Same helper for `order.paid` and `payment.captured`.
5. **Refund arriving before capture** (decision D2; default **yes**): on `refund.processed` for a `PENDING` or `FAILED` order whose refund amount is at least the order amount, mark it `REFUNDED` directly, since a refund implies a prior capture, and create no enrollments. Idempotent and terminal.
6. **Legacy orders with no user** (decision D3; default **refuse**): in `verifyRazorpayPayment`, `order.userId == null` → `ForbiddenError`. `create-order` has required a signed-in user for a while, so only pre-Clerk orders are affected; staff reconcile those by hand.
7. **Free/paid classification:** add `classifyCourse(course)`: free iff `isFree && price === 0`, paid iff `!isFree && price > 0`, anything else throws `ConflictError("Course pricing is misconfigured.")` and logs the course id. Use it in `createRazorpayOrder` and `enrollFreeCourses`. (A DB `CHECK` would be cleaner but needs a migration; propose it in the PR description only.)
8. **Config errors:** `getPaymentConfig` and `getRazorpayClient` must stop returning messages that name env vars or `server/.env`. Return `GatewayError("Payments are temporarily unavailable.")` and `console.error` the detail (variable *names* only, never values).
9. Update existing payments tests only where they encode the old behaviour, and say why in the PR.

### Tests (`order-state.unit.test.ts`)
- verify on a `REFUNDED` order → 409, no `order.update`, no `enrollment.upsert`.
- webhook `payment.captured` and `order.paid` on a `REFUNDED` order → `processed: false`, no writes.
- `FAILED` → `PAID` via verify and via webhook succeeds and enrolls.
- `PAID` re-verify is idempotent and does not change the order row.
- concurrent double verify: `updateMany` returning `count 0` the second time yields success without duplicate enrollments.
- `refund.processed` full refund on `PAID` → `REFUNDED` and enrollments deleted (existing behaviour preserved); on `PENDING` → `REFUNDED` without enrollments (D2); partial refund changes nothing.
- order with `userId == null` → 403.
- course `isFree=true, price>0` and `isFree=false, price=0` → 409 from both create-order and free-enroll.
- `getPaymentConfig` with no env → error message contains no `RAZORPAY` and no `.env`.

### Acceptance
- Both refund-reversal paths from the audit now end without any `PAID` write.
- `grep -n "status: \"PAID\"" server/src/payments/service.ts` shows `PAID` is only written inside `markOrderPaid`.

### Verify
```bash
npm --prefix server test -- payments
npm --prefix server run typecheck && npm --prefix server run lint
```
**Rollback:** revert the PR; no data was changed.

---

## PHASE 3: Identity sync (review and merge `auth/p3-identity-sync`)

**Branch:** work on `auth/p3-identity-sync` after rebasing it on `main`  **Closes:** findings 3, 4, 12 and the sync part of 13  **Agent:** plan (review first), then build
**Kickoff:** `/phase P3`

The fix already exists as commit `c6ba1d1f` on `auth/p3-identity-sync` (11 of the 37 `it.fails` call sites are already flipped there; **26 call sites / 30 runtime cases remain**). **The job is a review and gap-fill, not a rewrite.**

### Tasks (`CODE`)
1. `git fetch && git rebase origin/main` on the branch. Resolve conflicts; re-run the suite.
2. **Review against this checklist** (plan agent, read-only, one line of evidence per item). Fix whatever fails:
   1. `readPrimaryEmail` reports whether the chosen address is **verified**.
   2. An unverified address is stored as `email = null` and **never** used to adopt a legacy row.
   3. `syncProfileFromClerk(user, { allowCreate })`: webhooks call it with `allowCreate: false`.
   4. Unknown `user.updated` is a logged no-op; unknown `user.created` goes through `ensureAuthProfile` (a **fresh Clerk read**); a Clerk 404 returns 200 and creates nothing.
   5. `prisma.user.create` is reachable only via the allow-create path.
   6. `create` handles P2002: `clerkUserId` conflict returns the concurrent winner; `email` conflict creates with `email = null` and writes `PROFILE_EMAIL_CONFLICT`.
   7. A `conflictsOn(err, field)` helper tolerates `meta.target` as an array **and** as an index-name string.
   8. The update path no longer swallows P2002 silently (finding 12): it retries without `email` and audits.
   9. `emailVerifiedAt` is kept if already set and cleared if Clerk reports unverified (no more "now" on every sync).
   10. `anonymiseProfile` nulls `email`, `emailVerifiedAt`, `fullName`, `collegeName` and sets `deletedAt`/`clerkUserId` in **one** `$transaction` with its audit row.
   11. `ensureAuthProfile` no longer contains the dead tombstone query.
   12. No remaining references to a role (`role`, `readRole`, `requireRole`) anywhere under `server/src`.
3. Flip the remaining `it.fails` in `profile-sync.unit.test.ts` and `webhook-order.unit.test.ts` to `it`, keeping their assertions.
4. Add any test the checklist shows is missing (at minimum: silent-swallow replacement, string-form `meta.target`, concurrent first login).

### Acceptance
- `grep -rc "it.fails" server/src/auth/__tests__/profile-sync.unit.test.ts server/src/auth/__tests__/webhook-order.unit.test.ts` reports 0 for both.
- Checklist items 1 to 12 each have a one-line evidence note in the PR.
- Suite: no failures; expected-fail count drops by 11.

### `MANUAL` after deploy
1. Sign up with a new Google account: profile appears; `User.email` set and `emailVerifiedAt` set.
2. Delete that user in the Clerk dashboard: the row's PII is null.
3. Sign up again with the same address: a clean profile is created and `/api/auth/me` returns 200.

**Rollback:** revert; no migration. Rows already blanked by delete stay blank (intended).

---

## PHASE 4: Session origin, shared rate limits, error handling

**Branch:** `sec/p4-edge` **Closes:** findings 5, 6, 11 **Agent:** plan → build
**Kickoff:** `/phase P4` **New dependency:** `@upstash/redis` (add to **both** root and `server/package.json`, then run `npm run check:deploy`).
**Deploy gate:** P0.4 (`CLERK_AUTHORIZED_PARTIES`, Upstash vars) and P0.5 (Clerk dashboard) done.

### Tasks (`CODE`), in this order
1. **Tests first:** flip the 12 `it.fails` owned by this phase (see 0.5). Add tests for finding 11: malformed JSON body → 400 JSON (no stack), non-JSON webhook body → 400 JSON, unexpected error → 500 JSON with no `stack` field. Note: the static-scan test in `rate-limit.unit.test.ts` currently contains the literal `rateLimit(` itself, so it flags itself when flipped; the minimal, assertion-preserving fix is to build that literal via concatenation (e.g. `"rate" + "Limit(")`) and note it in the PR. If you consider that a test rewrite, **stop and ask**.
2. **`server/src/auth/config.ts`** (new):
   - `getAuthorizedParties(env: NodeJS.ProcessEnv = process.env): string[]`: read `CLERK_AUTHORIZED_PARTIES`, fall back to `CORS_ALLOWED_ORIGINS`; split on commas, trim, drop empties, strip one trailing `/`. Each entry must satisfy `new URL(entry).origin === entry`, else throw naming the **position**, never the value. The test calls `getAuthorizedParties({...})` with an env object, so the parameter is required.
   - `assertProductionConfig(env: NodeJS.ProcessEnv = process.env): void`: when `NODE_ENV === "production"`, throw if the list is empty and `console.warn` if any entry contains `localhost`. **Do not reference `GITHUB_*`** (removed on `main`). Under `NODE_ENV === "test"` it is a no-op.
3. **`server/src/app.ts`:** pass `authorizedParties: getAuthorizedParties()` to `clerkMiddleware`; call `assertProductionConfig()` in `createApp()`.
4. **`server/src/lib/rate-limit.ts`** (new): `createLimiter({ prefix, windowMs, limit, keyGenerator?, failClosed?, store?, env? })` and `UpstashStore implements Store` (express-rate-limit v8).
   - `new UpstashStore(prefix: string, windowMs: number, redis)`; key is `${prefix}:${key}`. `increment`: `redis.multi().incr(k).pttl(k).exec()`; if `pttl < 0`, `pexpire(k, windowMs)`; return `{ totalHits, resetTime }`. Also implement `decrement` (`redis.decr`), `resetKey` (`redis.del`), `init`.
   - `env` defaults to `process.env` and is injectable in tests; `store` is injectable too.
   - Lazy, module-level Redis singleton. Never create a client per request.
   - Production + memory store + no `RATE_LIMIT_ALLOW_MEMORY=1` → throw at boot with a secret-free message.
   - `passOnStoreError: !failClosed`; `failClosed: true` routes return `503 {"error":"Service temporarily unavailable"}` on store errors.
5. Replace **every** direct `rateLimit(` in `server/src/{payments,contact,auth}` with `createLimiter`, preserving limits and key generators. Keep exported limiter factory signatures (e.g. `createDeliveryLimiters`) so existing tests keep working; add an optional injected `store` for tests.
6. `server/src/auth/routes/me.ts`: `GET` 60/min, `PATCH` 10/min, keyed `me:${clerkUserId}`.
7. Finding 11: JSON body parser returns 400 JSON on `SyntaxError`; the Razorpay/Clerk webhook routes parse raw bodies inside `try/catch` and return 400 JSON; the global error handler always responds with JSON `{ error, ... }` and **never** includes `err.stack`; stacks are logged server-side only.

### Acceptance
- 12 owned `it.fails` → `it`; full suite green.
- `grep -rn "rateLimit(" server/src` finds only the definition in `lib/rate-limit.ts`.
- No response body contains a stack trace for any malformed-input or unexpected-error case.

### Verify
```bash
npm run check:deploy
npm --prefix server test && npm --prefix server run typecheck && npm --prefix server run lint
```
### `MANUAL` after deploy
Sign in on the real origin → `GET /api/auth/me` 200; a session from an origin not in `CLERK_AUTHORIZED_PARTIES` → 401; burst from two instances → single shared 429 counter.

**Rollback:** revert the PR; emergency stopgap if Upstash fails: set `RATE_LIMIT_ALLOW_MEMORY=1` in Vercel (accept per-instance limits until fixed).

---

## PHASE 5: SSRF-safe image proxy

**Branch:** `sec/p5-images` **Closes:** finding 7 **Agent:** plan → build
**Kickoff:** `/phase P5` **Depends on:** P4 (`createLimiter`) **Deploy gate:** P0.4 `IMAGE_PROXY_ALLOWED_HOSTS` reviewed.

### Tasks (`CODE`), in this order
1. **Tests first:** flip the 14 `it.fails` call sites owned by this phase (12 in `safe-fetch.unit.test.ts`, one of which runs 5 times in a loop → 16 runtime cases; 2 in `images/router.unit.test.ts`). Keep their assertions.
2. **`server/src/lib/safe-fetch.ts`** (new): export `safeFetchImage(rawSrc, { allowedHosts: Set<string>, lookup?, fetchImpl?, maxBytes = 10MB, timeoutMs = 8000, maxRedirects = 3 }): Promise<Uint8Array>`. The tests inject `lookup` (returns `[{ address, family }]`) and `fetchImpl` (returns a `Response`), so both must be optional overrides of `dns.lookup` and global `fetch`.
   - HTTPS only, no userinfo, port 443 only; exact hostname match against the allowlist (default `i.ibb.co`, `images.unsplash.com`, overridable by `IMAGE_PROXY_ALLOWED_HOSTS`). URL/host validation must happen **before** any lookup or fetch (five tests inject neither).
   - For the URL **and every redirect target**: `dns.lookup(hostname, { all: true })`, reject if **any** address is private/loopback/link-local (including 169.254 metadata), CGNAT `100.64/10`, IPv6 ULA, `::1`, or IPv4-mapped IPv6. Use `net.BlockList` and check every resolved address (DNS rebinding defence).
   - Manual redirects (`redirect: "manual"`), re-run all checks on each `Location`; cap redirects; `AbortSignal.timeout(timeoutMs)`.
   - Reject non-`image/*` and SVG content types (415); stream the body with a running byte cap (413) without trusting `Content-Length`; timeout → 504.
3. **`server/src/images/router.ts`:** use `safeFetchImage`; delete the same-origin `Host` bypass branch; reject SVG even when served with a misleading type; cap decoded pixels with `sharp` (`limitInputPixels`) before returning bytes; add a per-IP limiter from P4 (`createLimiter`, 120/min). Keep the response shape unchanged for allowed images.
4. Add tests for the same-origin bypass removal and for the limiter wiring.

### Acceptance
- All 14 owned `it.fails` flipped; suite green.
- No `fetch(` to a user-controlled URL remains outside `lib/safe-fetch.ts`.
- Allowlist is env-driven; no host is silently trusted by virtue of matching the request `Host`.

### Verify
```bash
npm --prefix server test -- images safe-fetch
npm --prefix server run typecheck && npm --prefix server run lint
```
**Rollback:** revert the PR; if a legitimate host is missing, add it to `IMAGE_PROXY_ALLOWED_HOSTS` (no code change).

---

## PHASE 6: SPA security headers

**Branch:** `sec/p6-headers` **Closes:** finding 8 **Agent:** plan → build
**Kickoff:** `/phase P6` **Deploy gate:** CSP starts **report-only**; no browser breaks on merge.

### Tasks (`CODE`)
1. **Tests first:** add `client/__tests__/security-headers.unit.test.ts` that reads `vercel.json` and asserts every required header is present on the SPA route pattern (no network calls). Run it red before editing config.
2. `vercel.json` already has a `headers` array (two `Cache-Control` entries) — extend it. Add a broad SPA entry (after the existing asset rules, e.g. `source: "/(.*)"`) with: `Content-Security-Policy-Report-Only` (allow the Clerk Frontend API host from P0.5, `self`, image allowlist, `style-src 'self' 'unsafe-inline'` for Tailwind), **no enforcing `Content-Security-Policy` yet**, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.

   Static files are served by Vercel, not Express, so `helmet()` in `app.ts` does **not** cover the SPA — the Vercel entry is required. Keep `/api/(.*)` exempt from the CSP rules; do not break Clerk script/style loading.
3. Document the follow-up: after 1–2 weeks of clean reports, promote the CSP to enforcing in a separate PR.

### Acceptance
- Header test green; `client` lint/test and server typecheck/test green.
- A local `curl -I` against the deployed SPA shows the report-only CSP and `frame-ancestors 'none'`.

### Verify
```bash
npm --prefix client test && npm --prefix client run lint
npm --prefix server run typecheck
```
**Rollback:** revert the PR; headers are config only.

---

## PHASE 7: Dependencies and dead code

**Branch:** `sec/p7-deps` **Closes:** finding 9 **Agent:** plan → build
**Kickoff:** `/phase P7`

### Tasks (`CODE`)
1. **Tests first:** add a dependency-hygiene test (e.g. `scripts/__tests__/deps.unit.test.mjs`) asserting root and server declare the same runtime dependency set (apart from documented exceptions) and that the removed packages are absent.
2. Grep the whole repo for imports of `multer`, `argon2`, `jose` (and their `@types`). Verified on `main`: all three are unused in source (`argon2`/`jose` are root-only, `multer` is in both manifests but has no import). Remove `multer`, `@types/multer`, `argon2`, `jose` from both root and server manifests where present.
3. Reconcile version drift between root and `server/package.json`: `@clerk/backend` `^3.16.13` vs `^3.17.1`, `@clerk/express` `^2.1.64` vs `^2.1.66`, `svix` `^2.1.0` vs `^2.3.0`. Prefer the server's ranges. Keep `@upstash/redis` from P4 in both. Regenerate lockfiles with `npm install --package-lock-only` in `/`, `/server` and `/client` if the network is available; otherwise document the command in the PR.
4. Raise the CI `npm audit` gate from `critical` to `high` in `.github/workflows/ci.yml`; fix or document remaining advisories. No other new dependencies.

### Acceptance
- `npm run check:deploy` green; root/server runtime dependency sets agree.
- Dependency-hygiene test green; CI audit gate is `high`.

### Verify
```bash
npm run check:deploy && npm --prefix server test && npm --prefix client test
npm --prefix server audit --omit=dev --audit-level=high
```
**Rollback:** revert the PR and restore both lockfiles.

---

## PHASE 8: Audit trail, config hygiene, docs, final verification

**Branch:** `sec/p8-final` **Closes:** findings 13, 14 **Agent:** plan → build
**Kickoff:** `/phase P8` **Depends on:** P2–P7 merged.

### Tasks (`CODE`)
1. **Tests first:** add tests for audit writes on auth/profile events: assert the row carries `ipAddress` and `userAgent` and that an audit-write failure does **not** fail the user request. Add tests that no error message contains an env var name or `.env` path.
2. Wire `server/src/auth/services/audit.ts` and `server/src/auth/context.ts` into the P3 profile-sync/webhook paths where P3 left gaps (no rewrite of P3). Capture IP from `req.ip` and UA from `req.headers["user-agent"]`; set `trust proxy` explicitly if Vercel's forwarded IP is needed.
3. Finish config hygiene: replace any remaining thrown messages naming `RAZORPAY_*`, `CLERK_*`, `UPSTASH_*`, `IMAGE_PROXY_*` or `.env` with a generic public message; log the detail at `console.error` with variable names only, never values. Confirm `emailVerifiedAt` is preserved/cleared per P3, not reset to "now" on every sync.
4. Update `README.md` (or add `docs/security.md`) with the env-var list, the human-only P0 runbook, and the phase status table. Mark Parts A/B of `implmentation/Auth.md` as historical and this plan as the current source of truth.
5. Run the final verification: all gates, `grep` checks from P2/P4/P5, `it.fails` count must be **0** across `server/src`, and the 37-call-site/41-runtime-case accounting in section 0.5 verified.

### Acceptance
- Zero `it.fails` remain; every gate green; audit assertions pass.
- No leaked env var names, PII, or stack traces in responses or logs.

### Verify
```bash
npm run check:deploy
npm --prefix server run typecheck && npm --prefix server run lint && npm --prefix server test
npm --prefix client run lint && npm --prefix client test
Get-ChildItem -Recurse server/src -Filter *.test.ts | Select-String 'it\.fails'   # expect no output
```
**Rollback:** revert the PR; config/docs only, no migration.

---

# APPENDICES

## Appendix A: `opencode.json` (V2, project root)

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "build",
  "permissions": [
    { "action": "*", "resource": "*", "effect": "allow" },

    // Human-only actions: never let the agent do these.
    { "action": "shell", "resource": "git push *", "effect": "deny" },
    { "action": "shell", "resource": "git push", "effect": "deny" },
    { "action": "shell", "resource": "git rebase *", "effect": "ask" },
    { "action": "shell", "resource": "git reset --hard *", "effect": "deny" },
    { "action": "shell", "resource": "git clean -f*", "effect": "deny" },

    // Secrets and generated/schema files are off limits.
    { "action": "read", "resource": "*.env", "effect": "deny" },
    { "action": "read", "resource": "*.env.*", "effect": "deny" },
    { "action": "read", "resource": "*.env.example", "effect": "allow" },
    { "action": "edit", "resource": "**/.env*", "effect": "deny" },
    { "action": "edit", "resource": "server/prisma/migrations/**", "effect": "deny" },
    { "action": "edit", "resource": "server/generated/**", "effect": "deny" },
    { "action": "shell", "resource": "prisma migrate *", "effect": "deny" },
    { "action": "shell", "resource": "prisma db push*", "effect": "deny" },
    { "action": "shell", "resource": "*prisma migrate*", "effect": "deny" },

    // The reviewer never edits and never spawns subagents.
    { "action": "subagent", "resource": "auth-reviewer", "effect": "allow" }
  ],
  "agents": {
    "auth-reviewer": {
      "description": "Read-only reviewer for auth-hardening diffs",
      "mode": "subagent",
      "permissions": [
        { "action": "edit", "resource": "*", "effect": "deny" },
        { "action": "shell", "resource": "*", "effect": "deny" },
        { "action": "subagent", "resource": "*", "effect": "deny" }
      ]
    }
  }
}
```

> Last matching rule wins. Put broad rules first and exceptions after them. Verify with `/phase P2` that a `git push` attempt is denied and an `.env` read is blocked before relying on this file.

## Appendix B: `AGENTS.md` (repo root)

```md
# Agent rules for Sedative-Physio-Blog

Read `implmentation/OPENCODE_IMPLEMENTATION_PLAN.md` before any auth-hardening work.

## Ground rules
1. One phase = one branch (`sec/pN-<topic>`) = one PR. Never mix phases.
2. Tests first. Show red then green. The existing `it.fails` tests are the spec: flip them to `it`, never rewrite their assertions. If a test looks wrong, stop and ask. There are 37 `it.fails` call sites (41 runtime cases because one sits in a loop) — see section 0.5.
3. Keep Clerk. No custom credential, JWT or session code.
4. No schema migrations. No edits under `server/generated/**` or `server/prisma/migrations/**`. Stop and ask if one seems needed.
5. No new dependencies except `@upstash/redis` in P4. Keep root and `server/package.json` in sync; run `npm run check:deploy`.
6. Never print or log secrets or PII. Never read `.env*`.
7. Fail closed: missing config, store errors on sensitive routes, and unknown input deny.
8. Smallest diff that meets the acceptance criteria. No drive-by refactors.
9. Do not push, rotate keys, rewrite history, or touch Clerk/Vercel/Razorpay/Upstash/GitHub settings.
10. When context gets long, start a fresh session with `AGENTS.md`, the phase section, and `git diff main...HEAD`.
```

## Appendix C: `.opencode/commands/`

### `phase.md`

```md
---
description: Read-only plan for one auth-hardening phase
agent: plan
---

Plan phase $1 from `implmentation/OPENCODE_IMPLEMENTATION_PLAN.md`.

Use the plan agent only. Do not edit any file. First verify the baseline and phase ownership of `it.fails` tests (see section 0.5). Answer with:
1. exact files you will touch and why;
2. the tests you will write/flip first, with names, and the expected red output;
3. risks, stop-and-ask conditions, and the acceptance commands you will run.
Wait for approval before any code changes.
```

### `verify.md`

```md
---
description: Run the phase gates and report
agent: build
---

Run the Verify block for phase $1 in `implmentation/OPENCODE_IMPLEMENTATION_PLAN.md`.

Run every listed command, paste the commands and their real output, and report pass/fail per gate. Do not change code. If a gate fails, report the first failing assertion and stop.
```

### `review.md`

```md
---
description: Review the current diff against the plan
agent: auth-reviewer
---

Review `git diff main...HEAD` against the acceptance criteria for phase $1 of `implmentation/OPENCODE_IMPLEMENTATION_PLAN.md`.

Report findings in severity order with file:line references and one line of evidence per acceptance criterion. Do not edit files.
```

## Appendix D: `.opencode/agents/auth-reviewer.md`

```md
---
description: Read-only reviewer for auth-hardening diffs (secrets, fail-closed, tests-first)
mode: subagent
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: shell
    resource: "*"
    effect: deny
  - action: subagent
    resource: "*"
    effect: deny
---

You are the auth-hardening reviewer. Read `implmentation/OPENCODE_IMPLEMENTATION_PLAN.md`, `AGENTS.md`, and the current diff. You never edit files and never run shell commands.

For the phase under review, check:
1. every acceptance criterion, with one line of evidence (file:line or command output quoted in the diff/PR);
2. every owned `it.fails` flipped to `it` with assertions unchanged;
3. no new custom auth/session/JWT code, no migrations, no `server/generated/**` edits;
4. no secrets, PII, env var names, `.env` paths, or stack traces in code, responses or logs;
5. fail-closed behaviour on sensitive routes and shared-store rate limits;
6. smallest diff — flag drive-by refactors.

Output findings in severity order, then a PASS/FAIL verdict. If evidence is missing, say so instead of assuming.
```

