# Design inspiration

Reference material for the Mitumba Pay checkout UI. Not shipped — this is design
direction only.

## Split-panel checkout (green summary + white form)

**File:** `split-panel-checkout.png` _(add the image here)_

A two-column payment screen:

- **Left panel — brand green (`#3D9A52`), subtle geometric watermark.**
  - Large amount (e.g. `$599.00`).
  - Line items: Commission, Total, with dotted leaders.
  - Invoice ID and next-payment date, each with a small icon.
  - "Customer Support: Online chat 24/7" pinned bottom, with a chat bubble button.
- **Right panel — white form.**
  - Title "Payment methods" + hamburger.
  - Tabs: Credit Card · Mobile Payment · + More (active tab underlined green).
  - Saved-method chips (`+`, `* 5949`, `* 3894` selected/filled green).
  - Card number with network mark, Expiration Date, CVV — underline inputs with
    trailing icons.
  - Name field.
  - Full-width green "Pay $599.00" button.

### Why it's relevant

Clean, trustworthy, brand-forward. The green/white split maps directly onto the
Mitumba palette (green `#3D9A52`, earth `#A06235`). This is a much stronger direction
than the current v0 widget (a bare token/order-ID form).

### Notes for our context

- We're **provider-neutral**: "Credit Card / Mobile Payment / + More" map to our
  `method` types (`card`, `mobile_money`, …) — the tabs pick a *method*, never a provider.
- Mobile Payment (M-Pesa/Airtel STK) is primary for Kenya; card is secondary. Consider
  leading with Mobile Payment for our market rather than Credit Card.
- The left summary panel is a great home for amount + order id + support, driven by
  `getCheckoutStatus` data.
