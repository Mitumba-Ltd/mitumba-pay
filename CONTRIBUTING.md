# Contributing to Mitumba Pay

## The one rule that matters most

This is a **public client SDK**, not the payment engine. Never add a provider
implementation, a credential, a webhook secret, or a routing rule here. If a change seems
to require knowing *how* a payment is processed (rather than *what* to send and *what*
comes back), stop and raise it — the fix belongs in the backend's public API, not here.

## Setup

```bash
npm install
npm run build
npm run typecheck
npm run test
npm run lint
```

Node 20 (see `.nvmrc`). npm workspaces + Turborepo.

## Changes and releases

We use [Changesets](https://github.com/changesets/changesets). For any change that affects
a published package, add a changeset:

```bash
npm run changeset
```

Pick the packages and bump levels. Packages version **independently** — they are not
lock-stepped. On merge to `main`, CI opens a Release PR; merging it publishes to npm via
OIDC Trusted Publishing with provenance. There is no stored `NPM_TOKEN`.

`apps/widget` and `apps/docs` are private and excluded from releases.

## Conventions

- TypeScript strict. Dual ESM/CJS builds via `tsup` with `.d.ts`.
- Requests/responses are validated against `@mitumba/pay-contract` (zod) at the boundary.
- The contract is the source of truth. Update `@mitumba/pay-contract` first, then consumers.
- Follow `next_action`; never branch on an exhaustive provider switch.
- Keep core framework-agnostic and auth-agnostic.

## Tests

Vitest. Add tests for new behavior (client paths, error mapping, polling, schema parsing).
