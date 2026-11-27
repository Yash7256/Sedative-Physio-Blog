# Sedative-Physio-Blog

New design in progress.

## Security hardening

Current plan, environment-variable list, human-only P0 runbook, and phase status: `implmentation/OPENCODE_IMPLEMENTATION_PLAN.md` and `docs/security.md`. Parts A/B of `implmentation/Auth.md` are historical context only.

## Razorpay Setup

### Environment Variables

Set the following variables in Vercel (or your `.env` file locally):

| Variable | Description |
|---|---|
| `RAZORPAY_KEY_ID` | Your Razorpay key ID (`rzp_test_...` for dev, `rzp_live_...` for prod) |
| `RAZORPAY_KEY_SECRET` | Your Razorpay key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signing secret from the Razorpay dashboard |
| `CORS_ALLOWED_ORIGINS` | Must include your production domain (e.g. `https://yourapp.vercel.app`) |

### Webhook Registration

Register a webhook in the [Razorpay dashboard](https://dashboard.razorpay.com/app/webhooks) pointing to:

```
https://<your-domain>/api/payments/webhook
```

Enable these events:
- `order.paid`
- `payment.captured`
- `payment.failed`
- `refund.processed`

### Keys

- Use `rzp_test_...` keys in development
- Use `rzp_live_...` keys in production
- **Never** commit `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET` to source control

## Catalog cache

Public course, note and model lists use `max-age=60`, `s-maxage=120` and
`stale-while-revalidate=120`, backed by a 60-second per-process response cache.
After editing those tables directly, call `POST /api/cache/purge` with a Clerk
session whose user id is listed in `CACHE_ADMIN_USER_IDS` (comma-separated).
It bumps every catalog version and invalidates the CDN tags.

The purge endpoint fails closed unless these are configured in the environment:

| Variable | Description |
|---|---|
| `CACHE_ADMIN_USER_IDS` | Comma-separated Clerk user ids allowed to purge |
| `VERCEL_ACCESS_TOKEN` (or `VERCEL_TOKEN`) | Token with permission to invalidate the project's CDN cache |
| `VERCEL_PROJECT_ID` (or `VERCEL_PROJECT_NAME`) | Target Vercel project |
| `VERCEL_TEAM_ID` | Optional team id when the project belongs to a team |

Catalog versions are already shared in Upstash Redis; each API instance refreshes its local copy at most once per second, so a purge converges across instances. See `docs/security.md` for the required variables and `docs/api-latency.md` for staleness and timing details.

## Note files

`GET /api/notes` is a public, cached catalog, and note previews are public too: `GET /api/notes/:id/file` streams the PDF inline without a Clerk session. File reads require the R2 configuration listed in `docs/security.md`; the browser never needs direct R2 access. There is no download endpoint or download button — opening a note previews it in the app.

## Deploy verification

CI runs the checks and then builds both packages. Mirror the build steps before deploying:

```bash
npm run check:deploy
npm run test:deps
npm --prefix server run typecheck && npm --prefix server run lint && npm --prefix server test && npm --prefix server run build
npm --prefix client run lint && npm --prefix client test && npm --prefix client run build
```
