# Security notes

This is the operational companion to `implmentation/OPENCODE_IMPLEMENTATION_PLAN.md`, which is the current source of truth for the auth-hardening work. `implmentation/Auth.md` Parts A/B are historical design context only.

## Phase status

All work below is **local**. Nothing has been pushed, merged, deployed, or applied to Clerk, Vercel, Razorpay, Upstash, or GitHub settings by the agent.

| Phase | Branch | CODE state | Human/deploy gate |
|---|---|---|---|
| P0 | — | Not agent work | **Pending.** Rotate secrets, purge history, and configure external services (runbook below). |
| P1 | `sec/p1-guardrails` (`9dfef37b`) | Complete | CI/gitleaks must be confirmed after the history purge. |
| P2 | `sec/p2-payments` (`5aab93db`) | Complete | Confirm Razorpay webhook events and refund policy. |
| P3 | `sec/p3-identity-sync` (`bd1ff6f7`, `0dc2ce60`) | Complete | Manual sign-up/delete/sign-up checks after deploy. |
| P4 | `sec/p4-edge` (`3a274a0d`) | Complete | Requires `CLERK_AUTHORIZED_PARTIES`, Upstash vars, and Clerk dashboard settings. |
| P5 | `sec/p5-images` (`6f935245`) | Complete | Review `IMAGE_PROXY_ALLOWED_HOSTS` before deploy. |
| P6 | `sec/p6-headers` (`994c7bf2`) | Complete | Review the report-only CSP with the real Clerk Frontend API host. |
| P7 | `sec/p7-deps` (`beccca91`) | Complete | Root-only dev advisories documented below. |
| P8 | `sec/p8-final` (this change) | Complete locally | Deploy only after P0 and the earlier deploy gates. |

## Expected-fail test accounting

The baseline had **37 `it.fails` call sites / 41 runtime cases**: P3 11/11, P4 12/12, and P5 14/18 (one call site runs five times). All have been flipped to `it` with their assertions preserved. The final recursive check over `server/src` must produce no `it.fails` output.

## Log hygiene

P8 closed two remaining PII/stack-trace gaps: a misconfigured SMTP setup now logs only a generic warning instead of the contact submission, and a failed Clerk name update logs only the error name instead of the raw SDK error.

## Environment variables

Never commit values. Set these in Vercel for the appropriate environment, or in an ignored local env file for development.

### Server / API

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Runtime mode. Production requires configured authorized origins. |
| `DATABASE_URL` | Prisma/PostgreSQL connection string. |
| `PORT` | Local server port; not needed on Vercel. |
| `CORS_ALLOWED_ORIGINS` | Exact browser origins allowed by CORS; also the fallback authorized-party list. |
| `CLERK_AUTHORIZED_PARTIES` | Exact origins Clerk may accept session tokens from; preferred over the CORS fallback. |
| `CLERK_SECRET_KEY` | Clerk Backend API client credential. |
| `CLERK_WEBHOOK_SECRET` | Verifies Clerk webhook signatures. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shared rate-limit store. Required in production unless `RATE_LIMIT_ALLOW_MEMORY=1` is an explicit local/dev override. |
| `RATE_LIMIT_ALLOW_MEMORY` | Escape hatch for per-instance in-memory limits. Do not enable in production. |
| `IMAGE_PROXY_ALLOWED_HOSTS` | Comma-separated image hosts; defaults to `i.ibb.co,images.unsplash.com` when unset. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Razorpay client and webhook signature verification. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_EMAIL` | Contact-form SMTP delivery. |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT` | Note-file storage. `R2_ENDPOINT` is optional when `R2_ACCOUNT_ID` is set. |

### Client

| Variable | Purpose |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend publishable key. |
| `VITE_API_URL` | API base URL; empty means same-origin. |

### Local development / seeding only

These are not Vercel runtime variables.

| Variable | Purpose |
|---|---|
| `VITE_API_PROXY_TARGET` | Dev-only Vite proxy target for the API; defaults to `http://localhost:4000`. |
| `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_REPO_BRANCH` | Metadata used only by `server/prisma/seeds` to build jsDelivr model URLs. Never put tokens or credentials in these values. |

## Human-only P0 runbook

The agent did **not** perform any of these steps:

1. **Rotate** every secret that ever lived in `.env.local` (Supabase service-role/anon keys, Vercel OIDC token, Grok key). If the Supabase project still exists, rotate its JWT secret or delete the project.
2. **Purge history** of `.env.local` and committed `node_modules` with `git-filter-repo`, force-push all refs and tags, ask GitHub Support to purge cached views and `refs/pull/*`, tell collaborators to re-clone, and run `gitleaks detect --log-opts="--all"` on a fresh clone. Rotation in step 1 is the actual protection; history rewriting only limits future copying.
3. **Revoke** the GitHub PAT (`GITHUB_TOKEN`) and delete all `GITHUB_*` variables from Vercel. The only remaining `GITHUB_REPO_*` reads are local seed metadata, never runtime credentials.
4. **Set Vercel environment variables** for Production and Preview per the tables above. `CLERK_AUTHORIZED_PARTIES` and `CORS_ALLOWED_ORIGINS` must be exact origins: no trailing slash, no paths, no `localhost` in Production.
5. **Clerk dashboard:** require email and verify it at sign-up; subscribe `/api/auth/webhooks/clerk` to `user.created`, `user.updated`, and `user.deleted`; restrict redirect URLs to real domains; enable bot/sign-up protection and make MFA available. Record the Frontend API host and review the report-only CSP allowlist in `vercel.json` after deploy.
6. **Create an Upstash REST Redis database** and set its two REST variables in Vercel.
7. **GitHub settings:** protect `main` (PR + passing CI, no force-push), enable secret scanning with push protection, and enable Dependabot alerts.
8. **Razorpay:** confirm the webhook is subscribed to `order.paid`, `payment.captured`, `payment.failed`, and `refund.processed`, and decide the refund policy questions D1/D2 in the plan.
9. **opencode setup:** the setup branch exists locally; merge it according to the owner's normal review process.

## Dependency hygiene (P7)

- Removed unused packages from both manifests where present: `multer`, `@types/multer`, `argon2`, and `jose`. A repository-wide grep found no source imports of them.
- Root and `server/package.json` declare identical runtime dependency sets, preferring the server's newer ranges for `@clerk/backend`, `@clerk/express`, and `svix`.
- `npm audit fix` was applied without `--force`. `nodemailer` was upgraded to `^10.6.1`, and `effect` is pinned to `3.22.5` through a root/server `overrides` entry. `npm --prefix server audit --omit=dev --audit-level=high` reports **0 vulnerabilities**.
- Root-only dev advisories from `@vercel/node` (`@fastify/busboy`/`undici`, `path-to-regexp`, `ajv`, `glob`, `minimatch`) remain. They are not part of the deployed server runtime, and npm's only offered fix is a breaking `@vercel/node@4` downgrade, so they are documented rather than force-fixed.
- The client manifest was not changed in P7. Re-running `npm --prefix client install --package-lock-only --ignore-scripts` locally fails with `EALLOWREMOTE` for an optional Tailwind WASM tarball; rerun it where remote optional tarballs are permitted if the client lockfile is regenerated.

## Final verification

```bash
npm run check:deploy
npm run test:deps
npm --prefix server run typecheck && npm --prefix server run lint && npm --prefix server test
npm --prefix client run lint && npm --prefix client test
npm --prefix server audit --omit=dev --audit-level=high
Get-ChildItem -Recurse server/src -Filter *.test.ts | Select-String 'it\.fails'
```

The last command must produce no output. The P2/P4/P5 structural checks are:

- `status: "PAID"` is written only inside `markOrderPaid` in `server/src/payments/service.ts`.
- `rateLimit(` appears only in `server/src/lib/rate-limit.ts`.
- No `fetch(` to a user-controlled URL exists outside `server/src/lib/safe-fetch.ts`.
