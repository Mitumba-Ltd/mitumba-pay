---
'@mitumba/pay-react': minor
---

Redesign `MitumbaPayWidget` as a split-panel checkout (green summary panel + white
method form), matching the Mitumba brand. Payment-method tabs (Mobile Payment first for
the Kenya market, then Card) select a *method* only — never a provider. The `onPay`
callback now receives `{ method, phone? }`, and the widget accepts `amountLabel`,
`lineItems`, `totalLabel`, `orderId`, and `methods` props.
