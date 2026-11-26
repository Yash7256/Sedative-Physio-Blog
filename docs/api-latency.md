# API latency — Sedative Physio

**Status:** P14 observability baseline. This document will be expanded as later phases land.

## SLA definition

The 1 ms target is a **server-side cache-hit target** measured from the `Server-Timing` response header. It is not an end-to-end internet round trip and it does not apply to cold database reads.

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

Report p50 and p99 separately for:

1. React Query / browser cache hit — no network request.
2. Edge cache hit — `x-vercel-cache: HIT`.
3. Origin L1 cache hit — `Server-Timing` contains only `cache`.
4. Cold DB miss — `Server-Timing` contains `cache` and `load`.

Never quote a single sample as the SLA.

## Shared catalog versions

Catalog versions live in Redis so a purge can invalidate every API instance. Each process keeps a local copy for up to 1 second (`CATALOG_VERSION_REFRESH_MS`) to keep reads free of Redis round trips.

- After an admin purge, every instance converges within that 1-second window.
- If Redis reads fail, public catalog reads keep serving their local cache instead of failing.
- The purge route fails closed with 503 when the version store is unavailable.
- CDN tags remain stable in this phase; edge entries are invalidated by tag.

## What is deliberately outside this target

- Cold database queries.
- Image conversion and note-file streaming.
- Authenticated routes, including checkout and account endpoints.
- Client device rendering time.
