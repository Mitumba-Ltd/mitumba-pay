---
'@mitumba/pay': minor
---

`MitumbaPay.redeemPaymentLink(token)` redeems a payment link's opaque token (`POST /pay/payment-links/:token/session`) for a checkout session. It sends no bearer token. A link that cannot pay throws a `PayError` with code `not_found`; one whose order is already paid, `order_not_payable`.
