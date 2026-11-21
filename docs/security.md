# Security notes

## Dependency hygiene (P7)

- Removed unused packages from both manifests where present: `multer`, `@types/multer`, `argon2`, and `jose`. A repository-wide grep found no source imports of them.
- Root and `server/package.json` now declare identical runtime dependency sets, preferring the server's newer ranges for `@clerk/backend`, `@clerk/express`, and `svix`.
- `npm audit fix` was applied without `--force`. `nodemailer` was upgraded to `^10.6.1`, and `effect` is pinned to `3.22.5` through a root/server `overrides` entry; both changes clear the high-severity server advisories.
- `npm --prefix server audit --omit=dev --audit-level=high` reports **0 vulnerabilities**.

### Remaining root-only advisories

`npm audit --audit-level=high` still reports four high and five moderate findings from the root-only dev dependency `@vercel/node` (`@fastify/busboy`/`undici`, `path-to-regexp`, `ajv`, `glob`, and `minimatch`). They are not part of the deployed server runtime (`api/index.ts` resolves its dependencies from the root runtime set), and npm's only offered fix is a breaking `@vercel/node@4` downgrade. They are documented here instead of forcing that downgrade in P7.

### Lockfiles

Root and server lockfiles were regenerated with `npm install --package-lock-only --ignore-scripts` and `npm --prefix server install --package-lock-only --ignore-scripts`.

The equivalent client command could not complete locally because remote tarball fetching is disabled:

```text
npm error code EALLOWREMOTE
npm error Refusing to fetch "https://registry.npmjs.org/@tailwindcss/oxide-wasm32-wasi/-/oxide-wasm32-wasi-4.3.3.tgz"
```

The client manifest was not changed in P7, so no client lockfile update was required. Re-run `npm --prefix client install --package-lock-only --ignore-scripts` in an environment that permits remote optional tarballs if the client lockfile is regenerated later.

Verify dependency hygiene with:

```bash
npm run test:deps
npm run check:deploy
```
