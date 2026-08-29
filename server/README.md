# Server

Node.js + Express API server for Sedative Physio.

## Commands

- `npm run dev` — start dev server with hot reload (tsx watch)
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled server
- `npm run typecheck` — type-check without emitting
- `npm run lint` — run oxlint

## Endpoints

- `GET /api/health` — health check
- `POST /api/auth/register` — create a user via `clerkClient.users.createUser`

  Body: `{ "email", "password", "firstName"?, "lastName"? }`. Password is validated server-side: **8+ characters** including an uppercase letter, a lowercase letter, a number, and a symbol. Clerk's built-in policy is bypassed via `skipPasswordChecks` so this rule is authoritative.
- `POST /api/auth/login` — attempts to sign in (see note below)
- `POST /api/auth/forgot-password` — looks up a user by email and issues a sign-in token via `signInTokens.createSignInToken()` for password reset

  Body: `{ "email" }` — never reveals whether an account exists.
- `POST /api/auth/webhooks/clerk` — Clerk webhook (user sync)
- `GET /api/auth/me` — returns the authenticated user's id (requires a valid Clerk session token in the `Authorization` header)

## Login note

Clerk does not expose a server-side email/password "login" via the Backend API. The correct login flow is client-side: the frontend uses Clerk's SDK (or hosted pages) to sign in, receives a session token, and sends it to the server in the `Authorization: Bearer <token>` header. The server verifies it via `clerkMiddleware`/`requireAuth` (see `/api/auth/me`).

`POST /api/auth/login` proxies Clerk's Frontend API, but Clerk's bot protection typically blocks a raw email/password request without client CSRF/captcha context, so it will likely return "Sign in requires additional verification." Prefer the client-side flow for production. Registration and password reset are fully supported server-side.

## Configuration

Environment variables are loaded from `.env`:

- `PORT` — server port (default `4000`)
- `CLERK_SECRET_KEY` — Clerk backend secret key
- `CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `CLERK_WEBHOOK_SECRET` — signing secret for Clerk webhooks

Copy `.env.example` to `.env` to get started.
