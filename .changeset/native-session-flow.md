---
'@mitumba/pay-native': minor
---

Add the country-aware hosted checkout session flow to the native package (RFC 0001),
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
