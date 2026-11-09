---
"@mitumba/pay-contract": minor
"@mitumba/pay": minor
"@mitumba/pay-react": minor
"@mitumba/pay-native": minor
---

Saved payment methods (ADR-012).

- `pay.paymentMethods.list(market)`, `save`, `remove` and `setDefault` cover the buyer's mobile-money numbers per market (`GET/POST/DELETE /pay/payment-methods`).
- `savedPhoneChoices(methods)` shapes them for a picker: default first, number masked to its last three digits.
- New contract types: `SavedPaymentMethod`, `SavedPaymentMethodsResponse` and `SavePaymentMethodInput`, with zod schemas.
- A saved method's `method` passes unchanged to `initiateCheckout` and `createAttempt`.
- Cards cannot be saved yet.
