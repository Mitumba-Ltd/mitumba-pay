# AGENTS.md

Guidance for AI agents (and humans) working in this repository.

## What this repo is

The **public client SDK** for Mitumba Pay. The real payment engine lives privately in
`Mitumba-Ltd/mitumba` under `workers/pay/`. This repo talks to that engine's HTTP API.

## Hard rules — do not violate

1. **No provider implementations.** No Daraja/Airtel/Intasend/Paystack/MTN/Vodacom code,
   ever. The backend routes to providers; the client picks only a *method*.
2. **No credentials or secrets.** No API keys, passkeys, shortcodes, webhook secrets.
3. **No routing rules.** No "if Kenya use X" logic. That is backend-owned.
4. **Provider ids are open metadata.** `ProviderId = KnownPaymentProvider | (string & {})`.
   Never write an exhaustive provider `switch` to drive checkout — follow `next_action`.
5. **If a task needs to know HOW a payment is processed, stop.** Raise it; the backend's
   public API separation is the problem to fix, not something to work around here.

## Structure

- `packages/contract` → `@mitumba/pay-contract` — types + zod + version (source of truth)
- `packages/core` → `@mitumba/pay` — headless client + state machine + polling
- `packages/react` → `@mitumba/pay-react` — web widget (view over core)
- `packages/native` → `@mitumba/pay-native` — RN native sheet (view over core, no WebView)
- `apps/widget`, `apps/docs` — private, unpublished

## Workflow

- Update the contract package first, then consumers.
- `npm run build && npm run typecheck && npm run test && npm run lint` before proposing done.
- Add a Changeset for any published-package change.
- Never add or store an `NPM_TOKEN`. Releases use npm OIDC Trusted Publishing + provenance.
