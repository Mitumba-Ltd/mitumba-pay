---
'@mitumba/pay-contract': minor
---

Add the country-aware hosted checkout session contract (RFC 0001). New,
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
