# API latency — Sedative Physio

**Status:** P14–P18 implemented. Deployment verification for the edge layer is still a `MANUAL` gate.

## SLA definition

The 1 ms target is a **server-side cache-hit target** measured from the `Server-Timing` response header. It is not an end-to-end internet round trip and it does not apply to cold database reads.

The number to quote is the p99 of the `cache` segment on responses that contain no `load` segment.

## Cache hierarchy

From fastest to slowest:

1. **React Query / browser cache** — no network request while the query is fresh (`staleTime: 60s`).
2. **Vercel edge cache** — `x-vercel-cache: HIT`; no origin request.
3. **Origin L1 cache** — `Server-Timing` contains only `cache`.
4. **Database** — `Server-Timing` contains `cache` and `load`; outside the 1 ms target.

## Reading `Server-Timing`

Every catalog response carries one header:

```http
Server-Timing: cache;dur=0.123;desc="catalog lookup", load;dur=4.567;desc="catalog load"
```

- `cache` is always present. It measures version lookup and LRU lookup.
- `load` is present only when the request had to produce a body, or waited for another request to produce it.
- A cache hit has only `cache`. A cache miss has both segments.
- A conditional `If-None-Match` request that returns 304 uses the same shape as a hit.

`Timing-Allow-Origin` is set to the configured `CORS_ALLOWED_ORIGINS` list so browser DevTools can expose these timings for cross-origin API calls. The request's `Origin` header is never echoed.

## Percentiles to report

Report p50 and p95/p99 separately for each layer in the cache hierarchy. Never quote a single sample as the SLA.

| Layer | Evidence | Current status |
|---|---|---|
| React Query / browser cache hit | No `/api/*` network entry in DevTools while fresh | Verified in local browser |
| Edge cache hit | `x-vercel-cache: HIT` on the second identical request | `MANUAL` on preview deployment |
| Origin L1 cache hit | `Server-Timing` contains only `cache` | p99 0.075 ms in local harness |
| Cold DB miss | `Server-Timing` contains `cache` and `load` | Fill in after deployment |

## Pre-serialized cache entries

A Sedative Physio cache fill serializes the response body once. Hits send those bytes directly instead of calling `JSON.stringify` again, so the hit path only performs the version/LRU lookup measured by the `cache` segment.

Local harness result after P17 (1000 sequential hits):

| Percentile | `cache;dur` |
|---|---:|
| p50 | 0.010 ms |
| p95 | 0.032 ms |
| p99 | 0.075 ms |
| max | 0.274 ms |

These are server-side lookup numbers from `Server-Timing`, not network timings.

## Public catalog fast path

Sedative Physio mounts anonymous catalog reads before Clerk:

- `GET /api/courses` and `GET /api/courses/:slug`
- `GET /api/models`
- `GET /api/notes`

Note files, downloads, contact, payments, images, auth, and cache purge stay behind Clerk. This keeps the measured fast path free of session verification without weakening any protected route.

## Shared catalog versions

Catalog versions live in Redis so a purge can invalidate every API instance. Each process keeps a local copy for up to 1 second (`CATALOG_VERSION_REFRESH_MS`) to keep reads free of Redis round trips.

- After an admin purge, every instance converges within that 1-second window.
- If Redis reads fail, public catalog reads keep serving their local cache instead of failing.
- The purge route fails closed with 503 when the version store is unavailable.
- CDN tags remain stable; edge entries are invalidated by tag.

## `HUMAN` prerequisites

Before the preview verification:

- Confirm the Vercel project has edge caching enabled for these routes.
- Confirm purge-by-tag is available for the project.
- Confirm `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` exist in every runtime where catalog purge is expected.

Do not send configuration values to an agent and do not rotate keys as part of this work.

## `MANUAL` preview verification

Use any authenticated-free catalog route, for example `/api/courses`. Record only headers and durations; never record cookies or tokens.

1. **Edge miss**

   Send the first request after deployment or after a purge. Expect:

   - `x-vercel-cache: MISS`
   - `Server-Timing` contains both `cache` and `load`
   - `Cache-Control` contains `s-maxage=120`
   - `Vercel-Cache-Tag` is present

2. **Edge hit**

   Send the same request again. Expect:

   - `x-vercel-cache: HIT`
   - `Server-Timing` contains only `cache`
   - `ETag` is identical to the miss response

3. **Conditional revalidation**

   Send the same request with the stored `ETag` in `If-None-Match`. Expect 304, no body, and the same ETag.

4. **Purge**

   Using the existing admin-only `POST /api/cache/purge` flow with a real Clerk session:

   - Send `{ "catalogs": ["courses"] }`.
   - Expect 200 when Redis and the CDN purge both succeed.
   - Expect fresh content on the next request.
   - Allow the documented 1-second convergence window before asserting that no instance serves the pre-purge version.
   - Expect 503 and no successful purge claim when the shared version store is unavailable.

5. **Record final numbers**

   Fill in the table above with the observed edge p50/p95/p99 and cold DB p50/p95/p99. Keep the origin L1 row separate from the edge row.

## Rollback

Revert the phase branch. No schema migration, generated Prisma file, or key rotation is involved. Reverting the Redis-version phase returns catalog invalidation to a single process; do not leave that state deployed with multiple API instances.

## What is deliberately outside this target

- Cold database queries.
- Image conversion and note-file streaming.
- Authenticated routes, including checkout and account endpoints.
- Client device rendering time.
