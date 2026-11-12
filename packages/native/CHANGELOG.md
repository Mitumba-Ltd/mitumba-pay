# @mitumba/pay-native

## 0.6.1

### Patch Changes

- @mitumba/pay@0.5.1

## 0.6.0

### Minor Changes

- 658a03c: Mobile money names the network the buyer pays from.

  **Breaking:** a mobile-money method is now `{ type: 'mobile_money', network, phone }` for `initiateCheckout`, session attempts and saved methods, and the backend rejects one without a `network`. The payment prompt goes to that network only (an M-Pesa STK push is never sent for an Airtel number), and the network is never guessed from the number, because numbers move between networks. The backend still picks the provider that reaches the network.

  - Contract: `Market.mobile_money_networks` (`MobileMoneyNetwork { id, name }`; read as `[]` from a backend without it); a session's mobile-money descriptors come one per network with `network`; `methodDescriptorKey` tells them apart; `mobileMoneyMethodSchema`; saved methods carry `network`; `network_not_offered` error code.
  - `@mitumba/pay`: `savedPhoneChoices(methods, networks?)` returns each number's `network` and names the network beside a buyer's own label ("Work · Airtel Money ••• 222").
  - `@mitumba/pay-react`: `MitumbaPayWidget` takes `networks` and `defaultNetwork`, asks "Pay from" before the number, and `onPay` sends `{ method: 'mobile_money', network, phone }` (`WidgetPayInput`). A saved number selects its network; an unavailable network shows as temporarily unavailable; with no networks, mobile money cannot be paid.
  - `@mitumba/pay-native`: `MitumbaPaySheet` takes `networks` / `defaultNetwork` likewise (`NativePayInput`); `MitumbaPaySessionSheet` lists one method per network and sends its network. `sessionMethodFor`, `descriptorPhone`, `initialNetwork`, `isNetworkPayable` are exported.

  Migrate: pass the market's `mobile_money_networks` to the widget or sheet, and forward `input.network` into the method you send.

### Patch Changes

- Updated dependencies [658a03c]
  - @mitumba/pay@0.5.0

## 0.5.0

### Minor Changes

- addf2c0: Saved payment methods (ADR-012).

  - `pay.paymentMethods.list(market)`, `save`, `remove` and `setDefault` cover the buyer's mobile-money numbers per market (`GET/POST/DELETE /pay/payment-methods`).
  - `savedPhoneChoices(methods)` shapes them for a picker: default first, number masked to its last three digits.
  - New contract types: `SavedPaymentMethod`, `SavedPaymentMethodsResponse` and `SavePaymentMethodInput`, with zod schemas.
  - A saved method's `method` passes unchanged to `initiateCheckout` and `createAttempt`.
  - Cards cannot be saved yet.

### Patch Changes

- Updated dependencies [addf2c0]
  - @mitumba/pay@0.4.0

## 0.4.0

### Minor Changes

- 3bc0c0f: Country-aware payments and a first-class "temporarily unavailable" state (ADR-010, ADR-012).

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

### Patch Changes

- Updated dependencies [3bc0c0f]
  - @mitumba/pay@0.3.0

## 0.3.1

### Patch Changes

- Updated dependencies [e769234]
  - @mitumba/pay@0.2.1

## 0.3.0

### Minor Changes

- 23332e4: Add the country-aware hosted checkout session flow to the native package (RFC 0001),
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

## 0.2.1

### Patch Changes

- Updated dependencies [c35f517]
  - @mitumba/pay@0.2.0

## 0.2.0

### Minor Changes

- 785f32d: Deliver the production checkout presentation across web and native:

  - Web: high-fidelity split-panel desktop checkout, mobile amount hero + rounded action
    sheet, remembered phone chips, order metadata, support, secure card redirect messaging,
    and dedicated confirmation/success/error states.
  - Native: scroll-safe mobile amount hero, thumb-sized method cards, Kenyan phone input,
    and dedicated STK confirmation/success/error states without a WebView.
  - Both surfaces remain provider-neutral: users choose a method and the backend chooses
    the provider.

## 0.1.0

### Minor Changes

- 9d1db02: First public release of the Mitumba Pay SDK.

  - `@mitumba/pay-contract`: provider-neutral wire contract (types + zod schemas + version).
  - `@mitumba/pay`: headless client with the checkout state machine and status polling
    (`initiateCheckout`, `getCheckoutStatus`, `pollCheckoutStatus`).
  - `@mitumba/pay-react`: web payment widget (`useCheckout`, `MitumbaPayWidget`, `MitumbaPayButton`).
  - `@mitumba/pay-native`: React Native payment sheet (`useCheckout`, `MitumbaPaySheet`) — native, no WebView.

  Provider selection is backend-owned; clients choose only a payment method and follow `next_action`.

### Patch Changes

- Updated dependencies [9d1db02]
  - @mitumba/pay@0.1.0
