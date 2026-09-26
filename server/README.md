# Server

Node.js + Express API server for Sedative Physio.

## Commands

- `npm run dev` — start dev server with hot reload (tsx watch)
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled server
- `npm run typecheck` — type-check without emitting
- `npm run lint` — run oxlint
- `npm run test` — run the vitest suite
- `npm run db:seed` — seed base data (`db:seed:courses`, `db:seed:notes`, `db:seed:models`)

## Endpoints

- `GET /api/health` — health check
- `GET /api/auth/me` — the caller's identity and local profile. Requires a valid
  Clerk session (cookie or `Authorization: Bearer <clerk session token>`).
  Returns `{ "clerkUserId", "userId", "role", "email", "fullName",
  "collegeName", "emailVerified" }`. Responds `401` if the session is valid but
  the local profile row is missing or has been tombstoned.
- `POST /api/auth/webhooks/clerk` — mirrors Clerk user state into the local
  profile. Authenticates via the Svix signature, not a Clerk session.
  Handles `user.created`, `user.updated` and `user.deleted`; unknown event
  types are ignored. Always `200` for a correctly signed event, so Clerk does
  not retry work that already succeeded.

Everything else that looks like auth — sign-up, sign-in, sign-out, session
refresh, password reset, email/phone verification, social login — is Clerk's
and is exercised through the Clerk SDK. Those routes intentionally do not exist
here; reimplementing them would mean two authorities disagreeing about who is
signed in.

### Who owns what

| Concern | Owner |
|---|---|
| Credentials, sessions, OAuth, email/phone verification, rate limiting, lockout | Clerk |
| `fullName`, `collegeName`, role mirror, orders, enrollments, audit log | this API + Postgres |

The two are joined by `User.clerkUserId`. A Clerk session proves *who is
calling*; the local row supplies everything the app acts on. Profile data
deliberately stays in Postgres rather than Clerk `publicMetadata`, so it remains
queryable in SQL and portable if the auth provider ever changes.

`User.role` mirrors Clerk's `publicMetadata.role` for queries, but
authorisation reads the **session claims**, not the database — a stale mirror
should fail closed rather than grant access.

### Auth layout

| Path | Owns |
|---|---|
| `constants.ts` | profile field caps, audit event names |
| `types.ts` | `RequestContext` (provenance passed into services) |
| `context.ts` | lifts ip/user-agent off the request |
| `middleware/require-auth.ts` | 401 for anonymous callers |
| `middleware/require-role.ts` | 401/403, role from session claims |
| `routes/me.ts` | `GET /me` |
| `webhook.ts` | Clerk webhook receiver (raw body + signature) |
| `services/webhook-verify.ts` | svix signature check, Clerk payload → mirror fields |
| `services/profile-sync.ts` | create / relink / sync / anonymise the profile row |
| `services/me.ts` | resolves the caller's profile |
| `services/audit.ts` | single writer for `AuthAuditLog` |

`clerkMiddleware()` is mounted globally in `app.ts` and attaches `req.auth`,
but never rejects anonymous callers — `requireAuth` is where "optional" becomes
"required", which is what lets `/api/payments` do optional auth off the same
middleware. `GET /api/health` is mounted *before* it deliberately, so a
misconfigured Clerk key cannot take the health check down with everything else.

`@clerk/express` v2 attaches `req.auth` as a **function** and does not augment
Express globally, so read it through `readAuth()` in `src/lib/clerk.ts` rather
than assuming `req.auth.userId` exists.

### Profile synchronisation

`user.created` resolves in three steps, all idempotent because Clerk retries
and can deliver out of order:

1. A row already has this `clerkUserId` → sync it.
2. Otherwise an **unlinked** row (`clerkUserId IS NULL`, not tombstoned) matches
   the primary email → adopt it. This is the migration path for anyone who
   registered before the Clerk cutover; their orders and enrollments are
   already attached to that row.
3. Otherwise create it.

`fullName` is only ever filled in, never overwritten, because it is collected in
this app's own post-sign-up step.

`user.deleted` **anonymises** rather than deletes: `clerkUserId` is nulled and
`deletedAt` stamped. A hard delete would fail outright, because `Order.userId`
is `ON DELETE RESTRICT`, and where there are no orders it would succeed and
silently drop enrollments, since `Enrollment.userId` is `ON DELETE CASCADE`.
Neither is acceptable for a record of what someone paid for.

## Configuration

Environment variables are loaded from `.env` (see `.env.example`):

- `PORT` — server port (default `4000`)
- `DATABASE_URL` — Postgres connection string; required
- `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — from the Clerk dashboard
- `CLERK_WEBHOOK_SECRET` — per-endpoint signing secret, for
  `POST /api/auth/webhooks/clerk`. Without it that endpoint fails loudly rather
  than skipping verification
- `CORS_ALLOWED_ORIGINS` — comma-separated origins allowed to send
  credentialed requests (Clerk's session cookies are HttpOnly and must be
  sent cross-origin)
- `RAZORPAY_*`, `GITHUB_*`, `SMTP_*`, `CONTACT_EMAIL` — see `.env.example`

Point the Clerk webhook at `<your-api-host>/api/auth/webhooks/clerk`, and
subscribe it to `user.created`, `user.updated` and `user.deleted`.
