---
'@mitumba/pay-contract': minor
'@mitumba/pay': minor
'@mitumba/pay-react': minor
'@mitumba/pay-native': minor
---

First public release of the Mitumba Pay SDK.

- `@mitumba/pay-contract`: provider-neutral wire contract (types + zod schemas + version).
- `@mitumba/pay`: headless client with the checkout state machine and status polling
  (`initiateCheckout`, `getCheckoutStatus`, `pollCheckoutStatus`).
- `@mitumba/pay-react`: web payment widget (`useCheckout`, `MitumbaPayWidget`, `MitumbaPayButton`).
- `@mitumba/pay-native`: React Native payment sheet (`useCheckout`, `MitumbaPaySheet`) — native, no WebView.

Provider selection is backend-owned; clients choose only a payment method and follow `next_action`.
