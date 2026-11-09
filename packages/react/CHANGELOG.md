# @mitumba/pay-react

## 0.7.0

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
  - @mitumba/pay@0.3.0

## 0.6.0

### Minor Changes

- 11070ab: Add `useCheckoutSession`, the web session-driven checkout controller (RFC 0001):
  loads the authoritative session context, submits an attempt via the session
  client secret, and polls session status to a terminal/retryable phase. The hosted
  widget renders over it; a client-deadline timeout surfaces "still confirming,"
  never payment failure. Also re-exports the session contract types
  (`CheckoutSessionContext`, `CheckoutMethodDescriptor`, `SessionPaymentMethod`,
  `Money`, …) for single-import consumers.

## 0.5.1

### Patch Changes

- Updated dependencies [e769234]
  - @mitumba/pay@0.2.1

## 0.5.0

### Minor Changes

- 73d8c6d: Add the hosted-checkout launcher and Bridge V2 transport (RFC 0001):

  - `openMitumbaPay()` — a framework-neutral launcher that mounts a fixed
    full-viewport iframe overlay, negotiates READY/INIT, and relays only a session
    id + client secret. Enforces exact widget-origin and `event.source` checks in
    both directions, scroll lock, focus restoration, Escape/close/complete/
    update-required handling, and a client timeout; resolves with a typed outcome.
  - Bridge V2 protocol — the `MITUMBA_PAY_*` message envelope plus `isBridgeMessage`
    / `isBridgeInitMessage` guards. V2 carries only a session id + client secret, so
    no client-authored amount, currency, country, or methods crosses the boundary.

  The widget loads all display data from session context. The legacy V1 bridge
  remains compatibility-only.

## 0.4.1

### Patch Changes

- Updated dependencies [c35f517]
  - @mitumba/pay@0.2.0

## 0.4.0

### Minor Changes

- ae2c28b: Add optional `logoUrl` branding to `MitumbaPayWidget`. The official hosted checkout now
  uses the approved Mitumba Pay logo from its own static assets instead of the fallback
  letter/text lockup.

## 0.3.0

### Minor Changes

- 785f32d: Deliver the production checkout presentation across web and native:

  - Web: high-fidelity split-panel desktop checkout, mobile amount hero + rounded action
    sheet, remembered phone chips, order metadata, support, secure card redirect messaging,
    and dedicated confirmation/success/error states.
  - Native: scroll-safe mobile amount hero, thumb-sized method cards, Kenyan phone input,
    and dedicated STK confirmation/success/error states without a WebView.
  - Both surfaces remain provider-neutral: users choose a method and the backend chooses
    the provider.

## 0.2.0

### Minor Changes

- 20c582e: Redesign `MitumbaPayWidget` as a split-panel checkout (green summary panel + white
  method form), matching the Mitumba brand. Payment-method tabs (Mobile Payment first for
  the Kenya market, then Card) select a _method_ only — never a provider. The `onPay`
  callback now receives `{ method, phone? }`, and the widget accepts `amountLabel`,
  `lineItems`, `totalLabel`, `orderId`, and `methods` props.

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
  - @mitumba/pay@0.1.0
