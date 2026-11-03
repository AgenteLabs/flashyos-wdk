# Migration — `@flashyos/*` → `@flashynetwork/*`

Part of the estate-wide npm scope rename from `@flashyos/*` to
`@flashynetwork/*`. This note is the short version; the full account is in
`README.md`'s "Publishing — the npm scope rename" section.

## What changed, in this repository

| Old name | New name |
|---|---|
| `@flashyos/wdk` | `@flashynetwork/wdk` |
| `@flashyos/wallet-wdk` | `@flashynetwork/wallet-wdk` |
| `@flashyos/signer` | `@flashynetwork/signer` |

Renamed:

- `name` in `packages/wdk/package.json`, `packages/wallet-wdk/package.json`,
  `packages/signer/package.json`.
- The `wdk → wallet-wdk` and `signer → wallet-wdk` dependency entries in
  `packages/wdk/package.json` and `packages/signer/package.json`.
- Every source `import`/`await import()` specifier naming
  `@flashyos/wallet-wdk` across `packages/signer/src/**` and
  `packages/wdk/src/**` (imports and tests both).
- The `@flashyos/wallet-wdk` path alias in `packages/signer/tsconfig.json`,
  `packages/wdk/tsconfig.json`, `packages/signer/vitest.config.ts` and
  `packages/wdk/vitest.config.ts`.
- `package-lock.json`, regenerated with `npm install` rather than hand-edited.
- Doc mentions of these three exact package names, where the doc is
  describing how to import or install one of them:
  `packages/wdk/README.md`, `packages/signer/INVARIANTS.md`,
  `docs/wallet/README.md`, `docs/wallet/architecture.md`,
  `docs/wallet/federation.md`, `docs/wallet/human-phases.md`,
  `docs/wallet/object.md`, `docs/wallet/provenance.md`,
  `docs/wallet/run.md`, `docs/wallet/testnet.md`,
  `docs/wallet/openapi.wallet.json`, `docs/wallet/schema/events.json` (and
  the hardcoded copy of that same description string in
  `packages/wdk/src/events.manifest.test.ts`, which the test compares
  byte-for-byte against the committed schema file).

**Not renamed, on purpose:** the bare word "flashyos" anywhere it is the
brand/platform name rather than the npm scope (keywords arrays, the
`flashyos-run` bin name, `FLASHYOS_*` env vars, the `flashyos.com` /
`api.flashyos.com` domains, `flashyos-plane.json`), the GitHub org/repo name
(`FlashyLabs/flashyos-wdk`), and `MESH.md`'s one mention of
`npx @flashyos/conformance` — a different package, owned by a different
repository, out of scope for this task.

## What this does not do

**It does not publish anything.** The `@flashynetwork` scope does not exist
on the public npm registry, and this build has no `NPM_TOKEN` or other
registry credential. `npm install @flashynetwork/wdk` (or `wallet-wdk`, or
`signer`) resolves nowhere for anyone outside this workspace until a human
with registry access creates the `@flashynetwork` org and actually runs a
publish.

**There is no publish workflow here to update.** This repository's
`.github/workflows/` holds only `ci.yml`, `codeql.yml`, `scorecard.yml` and
`secret-scan.yml` — none of them touch an npm registry or scope. If a
publish pipeline for these three packages exists, it is not in this
checkout (plausibly it lives in the private FlashyOS monorepo this
repository mirrors, per this repo's own description: "the public mirror...
extracted unchanged from the monorepo"). Renaming it is not something this
task could do from here.

**`@flashyos/wdk@0.1.0`, `@flashyos/wallet-wdk@0.1.0` and
`@flashyos/signer@0.1.0` stay live on the registry forever** — npm publishes
are immutable — and simply receive no further releases. The next release of
each ships only under `@flashynetwork/*`, once a human can publish it. The
companion `npm deprecate @flashyos/<name> "moved to @flashynetwork/<name>"`
for each of the three also needs a human with publish rights on the old
scope and was not run here.

## Verified locally

- `npm install` — clean; the lockfile regenerated with the new names, and
  npm linked the three renamed workspace packages to each other locally
  (their versions still match, so no registry lookup for the new scope was
  needed).
- `npm run typecheck` — clean, all three workspaces.
- `npm run lint` — clean.
- `npm test` — 302 workspace tests pass (1 pre-existing skip, unrelated to
  this change) across `wdk`, `wallet-wdk` and `signer`, plus all 16 root
  suite tests (strike, test-script, workflow-pins, lint, repository-url).
- `npm run build` — clean, all three workspaces (`dist/` is gitignored, not
  committed).
