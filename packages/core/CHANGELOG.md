# @mitumba/pay

## 0.2.1

### Patch Changes

- e769234: Harden base URL normalization against ReDoS: strip trailing slashes with a
  linear scan instead of a polynomial `/\/+$/` regex (CodeQL js/polynomial-redos).
  Behavior is unchanged for all real base URLs.

## 0.2.0

### Minor Changes

- c35f517: Add country-aware hosted checkout session support to the core client (RFC 0001),
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

### Patch Changes

- Updated dependencies [b54e91f]
  - @mitumba/pay-contract@0.2.0

## 0.1.0

### Minor Changes

- 9d1db02: First public release of the Mitumba Pay SDK.

  - `@mitumba/pay-contract`: provider-neutral wire contract (types + zod schemas + version).
  - `@mitumba/pay`: headless client with the checkout state machine and status polling
    (`initiateCheckout`, `getCheckoutStatus`, `pollCheckoutStatus`).
  - `@mitumba/pay-react`: web payment widget (`useCheckout`, `MitumbaPayWidget`, `MitumbaPayButton`).
  - `@mitumba/pay-native`: React Native payment sheet (`useCheckout`, `MitumbaPaySheet`) — native, no WebView.

  Provider selection is backend-owned; clients choose only a payment method and follow `next_action`.

### Patch Changes

- Updated dependencies [9d1db02]
  - @mitumba/pay-contract@0.1.0
