---
'@mitumba/pay': patch
'@mitumba/pay-react': patch
'@mitumba/pay-native': patch
---

Adds `sessionRefusal(context)`, which reports when a loaded checkout session cannot be paid: already paid, expired or cancelled (expiry judged by the server's clock), or no method this client can pay. Adds `formatMoneyCode(money)` for code-first amounts (`KES 6,150.00`). Both are re-exported from `@mitumba/pay-react` and `@mitumba/pay-native`.

`MitumbaPaySessionSheet` uses `sessionRefusal` to show the reason with a Close button instead of the payment form, and takes an `onRefused` callback. Without a `locale`, it shows code-first amounts.
