# API Latency: Implementation Plan for opencode

**Product:** Sedative Physio
**Baseline:** cut each phase from `main` **after** `sec/p13-catalog-cache` is merged. Current p13 commit: `a2fe9eb0`; current `main`: `e6e3e6b8`.
**Implementation note:** P14 was started before that merge and is branched from the current `sec/p13-catalog-cache` head so the catalog-cache code is present. Merge p13 first when integrating, then rebase this branch onto `main`.
**Goal:** make public catalog reads respond in **~1 ms server-side on a cache hit**. This is a cache-hit target measured with `Server-Timing`, not an end-to-end internet round trip and not a cold DB target.

> Canonical path: `implmentation/API_LATENCY_IMPLEMENTATION_PLAN.md`. `implmentation/` is the spelling already used by the auth plan; keep it consistent. This file does **not** replace `OPENCODE_IMPLEMENTATION_PLAN.md`.

---

## 0. Ground rules inherited from `AGENTS.md`

1. **One phase = one branch = one PR.** Use the existing `sec/pN-<topic>` naming convention even though this work is performance-focused. Never mix phases.
2. **Tests first.** Write the failing test, run it, see it fail for the intended reason, then implement and see it pass. Paste red/green output into the PR description.
3. **No schema migrations** and no edits under `server/generated/**` or `server/prisma/migrations/**`. Stop and ask if one seems needed.
4. **Keep Clerk.** No custom credential, JWT or session code. P16 only reorders public routes around Clerk; it does not replace Clerk.
5. **No new dependencies.** Reuse the existing `@upstash/redis`. Keep root `package.json` and `server/package.json` in sync and run `npm run check:deploy` after any dependency-adjacent change.
6. **Never read `.env*` files or print secrets/PII.** Env var names may appear in code/docs; values may not.
7. **Fail closed** on sensitive mutations and configuration errors. Public catalog reads degrade to the local cache when Redis is unavailable; they do not fail the request.
8. **Smallest diff that meets the acceptance criteria.** No drive-by refactors.
9. **No push, no merge, no key rotation, no Clerk/Vercel/Upstash/GitHub setting changes.** Those are human-only.
10. When context gets long, start a fresh session with `AGENTS.md`, this phase section, and `git diff main...HEAD`.

### Task legend

| Tag | Meaning |
|---|---|
| `CODE` | opencode does this |
| `HUMAN` | only the repo owner does this |
| `MANUAL` | verified by a person in a real environment after deploy |

---

## 1. What is already done

| Layer | Existing mechanism | File |
|---|---|---|
| Client | React Query `staleTime: 60s`, `gcTime: 5m`; tab return reuses cache | `client/src/lib/queryClient.ts` |
| Server L1 | LRU response cache, versioned keys, in-flight dedupe, ETag/304 | `server/src/lib/catalog-cache.ts` |
| CDN | `s-maxage=120`, `stale-while-revalidate=120`, `Vercel-Cache-Tag` | `server/src/lib/catalog-cache.ts` |
| Invalidation | Admin-only `/api/cache/purge` bumps versions after CDN purge | `server/src/cache/router.ts` |
| DB | Cursor pagination and composite indexes already migrated | `server/prisma/migrations/20261126000000_catalog_cursor_indexes` |

Do not reimplement any of these. The remaining work is measurement, cross-instance correctness, and removing avoidable work from the hot path.

---

## 2. Phase overview

| Phase | Branch | Theme | Size | Depends on | Deploy gate |
|---|---|---|---|---|---|
| **P14** | `sec/p14-server-timing` | Observability baseline | S | p13 merged | none |
| **P15** | `sec/p15-redis-catalog-versions` | Shared version state in Redis | M | P14 | `UPSTASH_REDIS_REST_*` present in every runtime |
| **P16** | `sec/p16-public-catalog-fast-path` | Move public reads before Clerk | M | P14 | review with `auth-reviewer` |
| **P17** | `sec/p17-preserialized-catalog-responses` | Pre-serialize cached JSON | S | P14, P16 | none |
| **P18** | `sec/p18-edge-latency-runbook` | Edge verification and runbook | S | P14-P17 | Vercel cache/purge settings reviewed by human |

**Recommended order:** P14 → P15 → P16 → P17 → P18. P14 comes first because every later claim needs a measurement. P16 and P17 are independent of P15 but should land after P14; P18 is last because it documents the final measured system.

---

## 3. Overall definition of done

- Client tab switching makes no duplicate API call while the query is fresh: **already true**.
- Origin L1 cache hit p99 ≤ **1 ms** measured by `Server-Timing` in one region.
- Edge cache hit observed on a preview deployment (`x-vercel-cache: HIT` on the second request).
- A purge invalidates every running API instance within the documented refresh window; no instance serves a pre-purge version after that window.
- Cold DB misses are not part of the 1 ms SLA; they are measured and reported separately.
- `npm --prefix server test`, `npm --prefix server run typecheck`, `npm --prefix server run lint`, `npm --prefix server run build`, `npm run test:deps`, and `npm run check:deploy` all pass.

---

# 4. PHASES

## PHASE 14: Observability baseline (`CODE`)

### Why

Browser `PerformanceResourceTiming` fields for cross-origin API calls are zeroed without `Timing-Allow-Origin`, so the current numbers cannot prove a 1 ms claim. We need server-side timing attached to the response itself.

### Files

- `server/src/lib/catalog-cache.ts`
- `server/src/app.ts` (for `Timing-Allow-Origin`)
- `server/src/lib/__tests__/catalog-timing.unit.test.ts` (new)
- `docs/api-latency.md` (new, placeholder section only)

### Tasks, in this order

1. **Test first** in `catalog-timing.unit.test.ts`:
   - First request is a cache miss and has `Server-Timing` with `cache;dur=<ms>` and a DB/load segment.
   - Second identical request is a hit and has no DB/load segment.
   - Conditional request with matching `If-None-Match` returns 304 and keeps the same timing header shape.
   - No response header contains an env value, token, user id, or PII.
2. Add a small timing helper used by the catalog middleware. Record:
   - `lookup`: time spent checking the LRU and version.
   - `load`: time spent in the route handler/DB on a miss.
   - Emit one combined `Server-Timing` header; do not add per-request logging.
3. Set `Timing-Allow-Origin` to the configured allowed origins. Use the same `CORS_ALLOWED_ORIGINS` parser style already in `app.ts`; never echo arbitrary `Origin` headers.
4. Add the measurement section to `docs/api-latency.md`: which header to read, how to distinguish hit/miss, and which percentile to quote.

### Acceptance

- A cache hit response carries `Server-Timing` with only the lookup segment.
- A miss carries both lookup and load segments.
- A 304 carries the same header shape and no body.
- Timing headers contain durations only; no secrets, PII, or raw env values.

### Verify

```powershell
npm --prefix server test
npm --prefix server run typecheck
npm --prefix server run lint
npm --prefix server run build
npm run check:deploy
```

Manual sanity check in the browser console after starting the dev servers:

```js
performance.getEntriesByType('resource')
  .filter(e => e.name.includes('/api/courses'))
  .map(e => e.name)
```

The resource entry should now be readable because of `Timing-Allow-Origin`.

---

## PHASE 15: Shared catalog versions in Redis (`CODE` + `HUMAN` config)

### Why

`server/src/lib/catalog-cache.ts:89-96` already says the version belongs in Redis with more than one API instance. Today `/api/cache/purge` bumps only one process and the CDN; other serverless instances can keep serving stale origin entries until their 60 s TTL expires.

### Files

- `server/src/lib/redis.ts` (new, shared lazy client factory)
- `server/src/lib/rate-limit.ts` (use the shared client; no behaviour change)
- `server/src/lib/catalog-cache.ts`
- `server/src/cache/router.ts`
- `server/src/lib/__tests__/catalog-cache.unit.test.ts`
- `server/src/cache/__tests__/router.unit.test.ts`
- `server/src/lib/__tests__/redis.unit.test.ts` (new)

### Design

- Redis key: `catalog:version:{catalog}`. Value: integer string.
- Each process keeps a local copy with `VERSION_REFRESH_MS = 1_000`. Reads use the local copy; an expired copy triggers a deduplicated Redis `GET`. This keeps the hot path free of a Redis round trip on every request.
- If the Redis read fails, a public GET falls back to the last known local version (or `0` on cold start) and serves the L1 cache. Log a generic warning without values or PII.
- `bump()` does Redis `INCR`, then updates the local copy. If Redis is unavailable, `bump()` rejects.
- `POST /api/cache/purge` fails closed: if Redis bump fails, return 503 and do not report success. Keep the existing "purge CDN before committing the version" intent; preflight the Redis connection before purging so a known missing config fails before the CDN call.
- Existing CDN tag scheme (`catalog-{catalog}`) stays unchanged in this phase to keep the diff small. Versioned CDN tags are a future hardening item, not part of this phase.

### Tasks, in this order

1. **Test first**:
   - Two `createCatalogCache()` instances simulate two processes.
   - Bumping through one instance leaves the other's cached body unreachable only after its local version refresh; assert the bounded stale window.
   - Redis `GET` failure on a public GET still serves a cached response.
   - Redis `INCR` failure makes `bump()` reject.
   - `/api/cache/purge` with missing Redis config returns 503 and does not call the CDN purge.
   - Existing ETag, dedupe, and allowed-params tests keep passing unchanged.
2. Add the shared Redis client factory in `server/src/lib/redis.ts`; refactor `rate-limit.ts` to import it. No new dependency.
3. Add the version provider to `catalog-cache.ts` and wire `bump()`.
4. Wire `cacheRouter` to await the Redis-backed bump.
5. Document the 1 s convergence window in `docs/api-latency.md`.

### Acceptance

- Two processes converge on a new catalog version within `VERSION_REFRESH_MS`.
- Public catalog reads remain available during a Redis outage.
- Purge returns 503 on Redis failure and never claims success it did not achieve.
- No env values, tokens, or PII are logged.

### `HUMAN`

- Ensure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` exist in every runtime where catalog purge is expected. Do not send values to opencode and do not rotate keys here.

### Verify

```powershell
npm --prefix server test
npm --prefix server run typecheck
npm --prefix server run lint
npm --prefix server run build
npm run test:deps
npm run check:deploy
```

---

## PHASE 16: Public catalog fast path (`CODE`, auth-adjacent)

### Why

`server/src/app.ts:74` mounts `clerkMiddleware` before the catalog routers at lines 77-79. Public catalog reads pay Clerk verification even on an L1 hit. Health is already mounted before Clerk for the same reason.

### Files

- `server/src/app.ts`
- `server/src/notes/router.ts` (split list route from download/file routes)
- `server/src/__tests__/app-public-fast-path.unit.test.ts` (new)

### Design

- Mount only these public reads before `clerkMiddleware`:
  - `GET /api/courses` and `GET /api/courses/:slug`
  - `GET /api/models`
  - `GET /api/notes` (list only)
  - `/api/health` stays where it is
- Keep after `clerkMiddleware`:
  - `GET /api/notes/:id/download`
  - `GET /api/notes/:id/file`
  - `/api/auth`, `/api/contact`, `/api/payments`, `/api/images`, `/api/cache/purge`
- Split `notesRouter` rather than moving the whole router. This prevents a future auth requirement on downloads/files from silently becoming public.
- `helmet`, `cors`, `cookieParser`, `express.json`, and `noStore()` still run before every route.

### Tasks, in this order

1. **Test first** with the existing `withServer` harness and a fake Clerk middleware that increments a counter:
   - `GET /api/courses`, `GET /api/models`, `GET /api/notes` do not invoke the fake Clerk.
   - Those responses still carry the catalog `Cache-Control`, `ETag`, and `Vercel-Cache-Tag` headers.
   - `/api/notes/:id/download` and `/api/cache/purge` still invoke Clerk and still require the same auth as before.
   - Unknown `/api/*` routes still return 404 with `no-store`.
2. Split the notes list route into a small public router; leave download/file on the protected router.
3. Reorder the mounts in `app.ts`.
4. Run the `auth-reviewer` subagent on the diff even though this is a performance phase; middleware order is auth-adjacent.

### Acceptance

- Public catalog list/detail requests never call Clerk.
- No protected route changes its auth behaviour.
- No custom auth code is introduced.
- Cache headers and `noStore` defaults are unchanged.

### Verify

```powershell
npm --prefix server test
npm --prefix server run typecheck
npm --prefix server run lint
npm --prefix server run build
npm run check:deploy
```

Then run `/review` so `auth-reviewer` checks the middleware diff against the acceptance criteria.

---

## PHASE 17: Pre-serialized cached responses (`CODE`)

### Why

On an L1 hit, `server/src/lib/catalog-cache.ts:131` calls `res.json(entry.body)`, which serializes the same object again for every request. Store the serialized bytes once at fill time and send them directly.

### Files

- `server/src/lib/catalog-cache.ts`
- `server/src/lib/__tests__/catalog-cache.unit.test.ts`
- `server/src/lib/__tests__/catalog-timing.unit.test.ts`

### Tasks, in this order

1. **Test first**:
   - Miss stores `{ body, serialized, etag }`; hit returns byte-identical JSON to the miss response.
   - ETag is computed once from the original body and is identical on hit and miss.
   - `Content-Type: application/json` is present on hit and miss.
   - Conditional hit still returns 304 with no body.
   - A `JSON.stringify` spy is called once on fill and not again on hit.
2. Extend `CacheEntry` with the serialized JSON string.
3. Change the hit path to `res.type("application/json").send(entry.serialized)` (or equivalent) while preserving status, headers, and 304 handling.
4. Keep the `res.json` wrapper on the miss path so the route code does not change.
5. Re-run P14 timing tests and record the before/after hit duration in the PR description.

### Acceptance

- Hit and miss bodies are byte-identical.
- ETag, `Cache-Control`, `Vercel-Cache-Tag`, and `Server-Timing` headers are unchanged in shape.
- Hit path performs no second `JSON.stringify`.
- p99 origin cache-hit duration is ≤ 1 ms in the local harness; if not, report the measured value and stop rather than loosening the assertion silently.

### Verify

```powershell
npm --prefix server test
npm --prefix server run typecheck
npm --prefix server run lint
npm --prefix server run build
npm run check:deploy
```

---

## PHASE 18: Edge verification and latency runbook (`CODE` + `HUMAN` + `MANUAL`)

### Why

The lowest client-visible latency comes from the browser or Vercel edge, not the origin. Headers are already emitted; this phase verifies the deployment actually honours them and writes the operational runbook.

### Files

- `docs/api-latency.md`
- `server/src/cache/router.ts` (only if versioned CDN tags are approved as a follow-up; otherwise no code)

### Tasks

1. **HUMAN**: confirm Vercel project settings for edge cache and purge-by-tag are enabled. Do not change them through opencode.
2. **MANUAL** on a preview deployment:
   - First `GET /api/courses` → expect `x-vercel-cache: MISS` and a `Server-Timing` load segment.
   - Second identical request → expect `x-vercel-cache: HIT` and no load segment.
   - Conditional request with the stored ETag → expect 304.
   - Admin purge → expect fresh content on the next request and no pre-purge version after the P15 convergence window.
3. Write `docs/api-latency.md` with:
   - Cache hierarchy: React Query → browser HTTP cache → Vercel edge → API L1 → DB.
   - The 1 ms SLA definition: server-side cache-hit p99 from `Server-Timing`.
   - Percentiles to report and how to read them.
   - Purge procedure and the known 1 s multi-instance convergence window.
   - Explicit statement that cold DB misses are outside the 1 ms target.
   - Rollback: revert the phase branch; no migration or key rotation is involved.

### Acceptance

- Edge HIT observed on preview.
- Purge behaviour matches the documented convergence window.
- Runbook contains no env values, tokens, or PII.
- Final numbers recorded: client cache hit, edge hit, origin L1 hit p50/p99, cold DB miss p50/p99.

### Verify

```powershell
npm --prefix server test
npm --prefix server run typecheck
npm --prefix server run lint
npm --prefix server run build
npm run test:deps
npm run check:deploy
```

---

## 5. Out of scope

- No schema migration, generated Prisma edit, or database push.
- No new npm dependency.
- No Clerk/Vercel/Upstash/Razorpay/GitHub setting changes.
- No key rotation, history rewrite, push, or merge by opencode.
- No custom auth, JWT, or session code.
- No attempt to make cold DB misses hit 1 ms.
- No change to the client-side cache TTLs already verified in the earlier tab-switch test.
