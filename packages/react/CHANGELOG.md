# @mitumba/pay-react

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
