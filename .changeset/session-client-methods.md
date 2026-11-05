---
'@mitumba/pay': minor
---

Add country-aware hosted checkout session support to the core client (RFC 0001),
alongside the unchanged legacy order-based methods:

- `listMarkets()` — public market discovery.
- `createCheckoutSession()` — buyer-authenticated session creation.
- `getCheckoutSessionContext()` — authoritative display context + server-authored
  available methods, authenticated with the session client secret.
- `createAttempt()` — submit a payment attempt (method only; backend picks the
  provider; follow `next_action`).
- `getCheckoutSessionStatus()` / `pollCheckoutSessionStatus()` — authoritative
  session lifecycle with server-authored polling.

Also adds a per-request bearer override (`RequestOptions.token`) so session-scoped
calls authenticate with the session client secret rather than the buyer token.
