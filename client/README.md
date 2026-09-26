# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Authentication (Clerk)

Clerk owns sign-in. The API has no credential endpoints — there is no local
login, signup or logout route — and this app never sees a password.

### Setup

1. Copy the publishable key from the API's environment into `client/.env`:

   ```sh
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

   Only the *publishable* key. `CLERK_SECRET_KEY` is server-side and must never
   be copied here; anything in a `VITE_` variable is compiled into the public
   bundle.

2. `ClerkProvider` is mounted in `src/main.tsx`, so the key is read at startup.
   A missing key fails loudly there rather than at the first API call.

3. The API base URL defaults to same-origin, with Vite proxying `/api` in dev.
   Set `VITE_API_URL` only if the API is served from another origin, and add that
   origin to the API's `CORS_ALLOWED_ORIGINS` (it defaults to
   `http://localhost:5173`).

### How a request is authenticated

Clerk's session cookie is `HttpOnly`, so the browser can only send it back
opaquely. Every API call therefore goes through `src/lib/api.ts`, which sets
`credentials: "include"`. Use `apiFetch`/`apiJson` rather than bare `fetch`, or
authenticated routes will silently return 401.

### Profiles vs. Clerk users

`src/lib/auth.tsx` exposes the app's own profile from `GET /api/auth/me`, not
Clerk's user object. That row is created by the `user.created` webhook, so
immediately after signup the API can answer `401 "Account not found."` for a
session that is perfectly valid. The context treats that as expected and retries
with backoff, showing a "setting up" state rather than an error.

Note the response carries two ids: `clerkUserId` (yours) and `userId` (the local
database row id). Clerk is identity; the local row is what the app reads.
