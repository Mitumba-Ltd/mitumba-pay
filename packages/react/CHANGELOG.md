# @mitumba/pay-react

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
