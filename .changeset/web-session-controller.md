---
'@mitumba/pay-react': minor
---

Add `useCheckoutSession`, the web session-driven checkout controller (RFC 0001):
loads the authoritative session context, submits an attempt via the session
client secret, and polls session status to a terminal/retryable phase. The hosted
widget renders over it; a client-deadline timeout surfaces "still confirming,"
never payment failure. Also re-exports the session contract types
(`CheckoutSessionContext`, `CheckoutMethodDescriptor`, `SessionPaymentMethod`,
`Money`, …) for single-import consumers.
