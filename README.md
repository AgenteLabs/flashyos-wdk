# FlashyOS on Tether WDK — the public mirror

```
        ██
       ██
      ██████
        ██
       ██
      ██
```

Governed economic agency for autonomous agent organizations, built on
[Tether WDK](https://github.com/tetherto/wdk). This repository is the
public mirror of the Apache-2.0 part of [FlashyOS](https://flashyos.com):
three packages and the documents, extracted unchanged from the monorepo.

[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

Built by [Flashy Labs](https://flashyos.com). Two smaller, standalone packages sit in front of a wallet like this one — [`@flashylabs/wdk-policy-guard`](https://github.com/FlashyLabs/wdk-policy-guard) and [`@flashylabs/wdk-staking-kit`](https://github.com/FlashyLabs/wdk-staking-kit) — if you want the spending-policy or staking piece without the rest of the plane.

## What's here

| Package | What it is |
|---|---|
| `packages/wallet-wdk` | The AAO `WalletCapability`; a `TransactionPolicy` that defers to a remote authorization plane (against tetherto/wdk PR #88's contract); an async policy rule for shipped WDK; extractor packs for EVM, TRON, swaps and bridges with a drift-checked manifest; an MCP elicitation handler and a client for `@tetherto/wdk-mcp-toolkit`; signed invoices and receipts; x402 (buyer and seller); the provenance verifier |
| `packages/signer` | The isolated signer: verify → refuse a seen nonce → re-derive the operation from the real call → refuse any mismatch → execute through WDK → report. WDK's policy engine as a deny-by-default second line; the Safe Allowance Module as a third; one derived account per agent; EIP-712 typed data through the same ladder. **Testnets only, by decision, with no flag that widens the list.** |
| `packages/wdk` | The agent object — `FlashyOrganization` and `FlashyAgent` on one transport interface with one event stream — and `flashyos-run` |
| `docs/wallet` | Threat model, spec, architecture, runbook, the per-phase documents, the published JSON Schemas, the OpenAPI fragment, the upstream materials |

## Install and check

```bash
npm install
npm run typecheck
npm test
```

## What this repo is not

- **Not the authorization plane itself.** The five checks, the ledger, the decision ladder, the routes, the organizational memory, and the demos that run against Postgres live in the FlashyOS monorepo and are described in `docs/wallet/`, with every number there pinned by a test in that repository. What's here is everything that runs *against* WDK, tested against the installed `@tetherto/wdk` engine.
- **Not connected to a mainnet.** `packages/signer`'s chain table is testnets only, and no flag or environment variable here widens it.
- **Not a partnership with Tether.** This repository integrates Tether's open-source WDK toolkit the way it would integrate any open-source library. Nothing here holds a seed in a test, nothing here reaches a live network, and nothing here claims a partnership with anyone.

## Findings about WDK, offered upstream

`docs/wallet/upstream/README.md` — what we'd contribute to `tetherto/wdk`, including a testnet-gap finding on the bridge module (`wdk-protocol-bridge-usdt0-evm` names mainnet chains only). Draft materials; submission is a person's decision, not this repository's.

## ⚡ The Strike

This README commits to a secret, the same way the signer commits to only ever re-deriving what actually happened:

```
sha256: ef4032a23ff44273cd1dd15177fd3f86887273f5d5bf84c124e261d6ab4fb5c2
```

The preimage is already on this page — one exact sentence from "What this repo is not," above. Recover it, hash it yourself (never trust, verify — that includes us), and open an issue titled `⚡ STRIKE` containing the sentence. First verified striker per release gets their name in [`STRIKERS.md`](STRIKERS.md).

No prize, no token. Just proof somebody read past the package table.

## Publishing — the npm scope rename

**Renamed from `@flashyos/*` to `@flashynetwork/*`.** `package.json`'s `name`
field in all three published workspaces now reads `@flashynetwork/wdk`,
`@flashynetwork/wallet-wdk` and `@flashynetwork/signer`, and the internal
cross-references between them (`wdk` and `signer` both depend on
`wallet-wdk`) were updated to match, in `package.json`, every source
`import`/`await import()` specifier, and the `tsconfig.json`/`vitest.config.ts`
path aliases that mirror them. This is the estate-wide `@flashyos/*` →
`@flashynetwork/*` npm scope rename, applied here. Nothing about the
packages' behaviour changed; `npm run typecheck`, `npm test` and
`npm run build` all pass clean against the renamed workspace after a fresh
`npm install` (the lockfile regenerated cleanly too — npm linked the three
renamed workspaces to each other locally, since their declared versions
still match, without needing to reach the registry for the new scope at
all). Versions stay at `0.1.0`; these are pre-1.0 packages and the rename
itself is the breaking change this version line is signalling.

**This commit renames the packages locally. It does not publish them.** The
`@flashynetwork` scope does not exist on the public npm registry yet, and
this build holds no `NPM_TOKEN` or other registry credential — publishing
was neither attempted nor possible from here. Until a human with registry
access creates the `@flashynetwork` org on npmjs.com and actually runs a
publish, `npm install @flashynetwork/wdk` (or `wallet-wdk`, or `signer`)
resolves nowhere for anyone outside this workspace.

**There is no publish workflow in this repository to update.** Unlike
`flashy-ledger`, which ships its own `.github/workflows/publish.yml`, this
repository's `.github/workflows/` holds only `ci.yml`, `codeql.yml`,
`scorecard.yml` and `secret-scan.yml` — none of them reference an npm
registry or an `@flashyos/*`/`@flashynetwork/*` scope. This repository
describes itself as "the public mirror... extracted unchanged from the
monorepo," so the actual `npm publish` of these three packages, whatever
pipeline runs it, lives outside this checkout. If one does exist elsewhere
(most plausibly in the private FlashyOS monorepo this mirrors), it needs the
matching rename made where it actually lives — that is not a file this
repository has.

**`@flashyos/wdk@0.1.0`, `@flashyos/wallet-wdk@0.1.0` and
`@flashyos/signer@0.1.0` are retired, not retracted, and stay live.** npm
publishes are immutable — nothing can unpublish or edit a landed version —
so all three keep working on `registry.npmjs.org` forever for any existing
consumer still pinned to the old scope. They simply receive no further
releases: the next release of each, once a human can actually publish it,
ships only under `@flashynetwork/*`. The companion step —
`npm deprecate @flashyos/wdk "moved to @flashynetwork/wdk"` and the same for
`wallet-wdk` and `signer`, pointing consumers at the new name — also needs a
human with publish rights on the *old* scope, and was neither run nor
attempted here.

## License

Apache-2.0.

---

Built by [Flashy Labs](https://flashyos.com), the mesh platform for organisations' agents. If something here is broken, unclear, or just interesting, [open an issue](https://github.com/FlashyLabs/flashyos-wdk/issues) — we read them.
