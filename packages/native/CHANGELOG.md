# @mitumba/pay-native

## 0.3.1

### Patch Changes

- Updated dependencies [e769234]
  - @mitumba/pay@0.2.1

## 0.3.0

### Minor Changes

- 23332e4: Add the country-aware hosted checkout session flow to the native package (RFC 0001),
  alongside the unchanged legacy order-based sheet:

  - `useCheckoutSession` — a headless controller that loads the authoritative session
    context, submits one attempt via the session client secret, and polls session
    status to a terminal/retryable phase. No WebView; a client-deadline timeout is
    "still confirming," never a failure.
  - `MitumbaPaySessionSheet` — a native sheet rendered entirely from the session
    context: the `Money` amount, line items, and server-authored `available_methods`
    with their input-field descriptors. Provider names never appear; the buyer picks a
    method and the UI follows `next_action`.
  - `formatMoney` — a provider-neutral `Money` formatter.

## 0.2.1

### Patch Changes

- Updated dependencies [c35f517]
  - @mitumba/pay@0.2.0

## 0.2.0

### Minor Changes

- 785f32d: Deliver the production checkout presentation across web and native:

  - Web: high-fidelity split-panel desktop checkout, mobile amount hero + rounded action
    sheet, remembered phone chips, order metadata, support, secure card redirect messaging,
    and dedicated confirmation/success/error states.
  - Native: scroll-safe mobile amount hero, thumb-sized method cards, Kenyan phone input,
    and dedicated STK confirmation/success/error states without a WebView.
  - Both surfaces remain provider-neutral: users choose a method and the backend chooses
    the provider.

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
