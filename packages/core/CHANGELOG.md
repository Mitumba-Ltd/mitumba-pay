# @mitumba/pay

## 0.3.0

### Minor Changes

- 3bc0c0f: Country-aware payments and a first-class "temporarily unavailable" state (ADR-010, ADR-012).

  - **Contract:**
    - The order-based initiate method takes any E.164 phone (`E164_PHONE`, shared with sessions).
    - Checkout status reports `amount` as `Money` with an open ISO 4217 currency instead of the `'KES'` literal.
    - The backend validates both against the order's market.
    - `KENYAN_MSISDN` is deprecated but still exported.
  - **Core:**
    - `PayError` gains `retryAfterMs` (parsed from `Retry-After`, seconds or HTTP-date) and `isUnavailable` (503). `isTemporary` remains as a deprecated alias.
    - GET retries never wait less than the server asked, and a 503 that names a long wait is surfaced at once.
    - New market-driven helpers: `normalizePhone`, `isValidPhone` and `nationalPart` (from a `PhoneFormat`), plus `formatMoney` and `currencyDigits`, which divide by the currency's own minor unit (UGX has none).
  - **React and native:**
    - Every hook has an `unavailable` phase for 503 (paused, or provider down) instead of a generic `error`.
    - `MitumbaPayWidget` and `MitumbaPaySheet` take `phoneFormat` from the host's market. They no longer hardcode `+254`, a Kenyan regex or Kenyan copy, and send E.164.
    - Breaking (0.x): without `phoneFormat`, they accept only a full international number.
    - The session sheet normalizes the phone against the session's `calling_code` and takes a `locale` prop instead of assuming `en-KE`.
    - `unavailableMessage` and the core helpers are re-exported.

### Patch Changes

- Updated dependencies [3bc0c0f]
  - @mitumba/pay-contract@0.3.0

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
