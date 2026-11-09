---
"@mitumba/pay-contract": minor
"@mitumba/pay": minor
"@mitumba/pay-react": minor
"@mitumba/pay-native": minor
---

Country-aware payments and a first-class "temporarily unavailable" state (ADR-010, ADR-012).

- **Contract:**
  - The order-based initiate method takes any E.164 phone (`E164_PHONE`, shared with sessions).
  - Checkout status reports `amount` as `Money` with an open ISO 4217 currency instead of the `'KES'` literal.
  - The backend validates both against the order's market.
  - `KENYAN_MSISDN` is deprecated but still exported.
- **Core:**
  - `PayError` gains `retryAfterMs` (parsed from `Retry-After`, seconds or HTTP-date) and `isUnavailable` (503). `isTemporary` remains as a deprecated alias.
  - GET retries never wait less than the server asked, and a 503 that names a long wait is surfaced at once.
  - New market-driven helpers: `normalizePhone`, `isValidPhone` and `nationalPart` (from a `PhoneFormat`), plus `formatMoney` and `currencyDigits`, which divide by the currency's own minor unit (UGX has none).
- **React and native:**
  - Every hook has an `unavailable` phase for 503 (paused, or provider down) instead of a generic `error`.
  - `MitumbaPayWidget` and `MitumbaPaySheet` take `phoneFormat` from the host's market. They no longer hardcode `+254`, a Kenyan regex or Kenyan copy, and send E.164.
  - Breaking (0.x): without `phoneFormat`, they accept only a full international number.
  - The session sheet normalizes the phone against the session's `calling_code` and takes a `locale` prop instead of assuming `en-KE`.
  - `unavailableMessage` and the core helpers are re-exported.
