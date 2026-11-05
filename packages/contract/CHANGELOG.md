# @mitumba/pay-contract

## 0.2.0

### Minor Changes

- b54e91f: Add the country-aware hosted checkout session contract (RFC 0001). New,
  additive shapes alongside the legacy order-based checkout, all at wire version 1:

  - `Money` — provider-neutral `{ currency, minor_units }` with an open ISO 4217
    currency and nonnegative safe-integer amounts.
  - Market discovery — `Market`, `MarketsResponse`, and the open `PaymentMethodType`
    (the buyer-visible payment network, never the backend processor).
  - Checkout sessions — `CreateCheckoutSession` input/response, the authoritative
    `CheckoutSessionContext` with server-authored `available_methods`, the session
    attempt input (generic E.164 phone), and `CheckoutSessionStatusResponse`.

  Method types and provider ids remain open strings so new markets, methods, and
  providers require no SDK release.

## 0.1.0

### Minor Changes

- 9d1db02: First public release of the Mitumba Pay SDK.

  - `@mitumba/pay-contract`: provider-neutral wire contract (types + zod schemas + version).
  - `@mitumba/pay`: headless client with the checkout state machine and status polling
    (`initiateCheckout`, `getCheckoutStatus`, `pollCheckoutStatus`).
  - `@mitumba/pay-react`: web payment widget (`useCheckout`, `MitumbaPayWidget`, `MitumbaPayButton`).
  - `@mitumba/pay-native`: React Native payment sheet (`useCheckout`, `MitumbaPaySheet`) — native, no WebView.

  Provider selection is backend-owned; clients choose only a payment method and follow `next_action`.
