# Resource flow analytics

Scope: the anonymous path **Resources page → `GET /api/courses` → rendered course cards**. No other product surface uses this contract.

## Events

| Event | When | Payload |
|---|---|---|
| `resources_viewed` | Once per `/resources` visit whose active filter is courses | `filter: "courses"` |
| `courses_catalog_requested` | Immediately before a browse-UI course list fetch | — |
| `courses_catalog_succeeded` | After a well-formed browse-UI page arrives | `count`, `durationMs` |
| `courses_catalog_failed` | After a failed/invalid browse-UI page | `statusBucket`, `durationMs` |
| `course_cards_rendered` | Once per loaded course page | `count` |
| `courses_load_more_clicked` | On the courses Load more click | — |

`count` is bounded to 0–50 (the server page cap). `durationMs` is bounded to 0–10,000 (the client query timeout). `statusBucket` is one of `4xx`, `5xx`, `network`, `timeout`; the raw status, message, cursor, URL, course id and user id are never sent.

## Transport

`client/src/lib/analytics.ts` sends a flat JSON body to `POST /api/analytics` with `navigator.sendBeacon`, falling back to a credential-free `keepalive` fetch. `credentials: "omit"` keeps Clerk cookies off the analytics request. Telemetry failures are swallowed and cannot break the catalog render.

The server validates the event name and field types before recording, returns `204` on success, `400` on an unknown event or unsafe bucket, and `429` when the public 120/minute-per-IP analytics limiter is exhausted. Requests are mounted before Clerk and never read `req.auth`.

## Storage

`server/src/analytics/store.ts` writes low-cardinality Redis counters:

```text
analytics:<event>:<filter|all>:<statusBucket|ok>:<hour ISO>:events
analytics:<event>:<filter|all>:<statusBucket|ok>:<hour ISO>:cards
analytics:<event>:<filter|all>:<statusBucket|ok>:<hour ISO>:duration-ms
```

Numeric fields go into sum keys, not into the key space, so a caller cannot mint unbounded entries. Each key gets a 7-day TTL. A missing or failing Redis store disables recording only; the page and the catalog endpoint keep working.

The `cards` and `duration-ms` keys are counters/sums, not averages. Divide a sum by the corresponding `events` count in the same hour to get a mean.

## Still deliberately out of scope

- CSP stays report-only until the Clerk, Fontshare, Razorpay and PDF-worker allowlist is verified in a live deployment.
- `ClerkProvider` still wraps the whole app, including anonymous pages. Changing that is app-shell architecture, not this resource-flow phase.
- The catalog cache-before-limiter order is intentional; see `docs/api-latency.md`.
