# Agent rules for Sedative-Physio-Blog

Read `implmentation/OPENCODE_IMPLEMENTATION_PLAN.md` before any auth-hardening work.

## Ground rules
1. One phase = one branch (`sec/pN-<topic>`) = one PR. Never mix phases.
2. Tests first. Show red then green. The existing `it.fails` tests are the spec: flip them to `it`, never rewrite their assertions. If a test looks wrong, stop and ask. There are 37 `it.fails` call sites (41 runtime cases because one sits in a loop) — see section 0.5 of the plan.
3. Keep Clerk. No custom credential, JWT or session code.
4. No schema migrations. No edits under `server/generated/**` or `server/prisma/migrations/**`. Stop and ask if one seems needed.
5. No new dependencies except `@upstash/redis` in P4. Keep root and `server/package.json` in sync; run `npm run check:deploy`.
6. Never print or log secrets or PII. Never read `.env*`.
7. Fail closed: missing config, store errors on sensitive routes, and unknown input deny.
8. Smallest diff that meets the acceptance criteria. No drive-by refactors.
9. Do not push, rotate keys, rewrite history, or touch Clerk/Vercel/Razorpay/Upstash/GitHub settings.
10. When context gets long, start a fresh session with `AGENTS.md`, the phase section, and `git diff main...HEAD`.
