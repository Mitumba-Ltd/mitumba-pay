---
'@mitumba/pay-contract': patch
'@mitumba/pay': patch
'@mitumba/pay-react': patch
'@mitumba/pay-native': patch
---

Saved numbers in checkout sessions.

- `CheckoutSessionContext.saved_methods` lists the buyer's saved mobile-money numbers for the session (`{ id, label, method, is_default }`). It defaults to `[]` when a server omits it.
- `CreateAttemptInput.save_method` asks the server to save the attempt's mobile-money number once the attempt is accepted.
- `savedPhoneChoices` accepts a session's saved methods.
- The `useCheckoutSession` hooks take `pay(method, key, { saveMethod })`.
- `MitumbaPayWidget` has an `offerToSave` prop. For a valid number that is not already saved, it shows "Save this number for next time" (on by default) and sends `save: true` with the mobile-money `onPay`.
- `MitumbaPaySessionSheet` shows the selected network's saved numbers as one-tap choices, preselects the default, and offers the same save toggle for a new number.
