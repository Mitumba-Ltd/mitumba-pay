# RFC 0001 — Country-aware hosted checkout sessions

**Status:** Proposed  
**Scope:** Public contract and client lifecycle only. Provider implementations, credentials,
routing weights, settlement, and reconciliation remain private backend concerns.

## 1. Decision summary

A browser or mobile client may select a **market while browsing**, but it must not assert a
country, currency, amount, or provider when initiating payment.

The authoritative flow is:

```text
market selection -> validated order/session -> server-authored checkout context
                 -> client chooses one available method -> backend chooses provider
```

- Marketplace checkout derives market, currency, and amount from the order.
- External merchants specify market/currency/amount only from their trusted server when
  creating a checkout session.
- The checkout session returns the payment methods available for that exact payment.
- Payment initiation submits only the session, idempotency key, selected method, and the
  method's required buyer input.
- Provider ids remain open, observable metadata and never drive client behavior.

## 2. Why `country` does not belong in `initiateCheckout`

A free-form client field such as:

```ts
initiateCheckout({ order_id, country: 'KE', method: ... })
```

would allow the browser to disagree with the order, currency, delivery address, merchant,
or listing market. It would also tempt clients to implement country/provider routing.

Instead:

1. The app may call `listMarkets()` and let the buyer choose a browsing market.
2. Order creation validates listing market, delivery address, logistics eligibility, and
   currency, then snapshots the market onto the order.
3. Checkout-session creation derives its market from that order.
4. Initiation trusts only the immutable session.

Changing market means creating a new order/session. A funded session never changes market
or currency.

## 3. Current-state findings motivating this RFC

The current marketplace is Kenya-only in data and behavior:

- Retail orders have `city_id` plus ambiguous integer `amount`, `delivery_fee`, and `total`
  fields documented as KES.
- Bale orders use KES-specific fields (`unit_kes`, `total_kes`, `freight_kes`).
- Checkout status emits `currency: 'KES'` and converts the stored whole-KES integer to minor
  units by multiplying by 100.
- The provider-neutral initiation input validates only Kenyan `+254` phone numbers.
- There is no market table, checkout-session resource, checkout-context route, or
  available-method discovery route.
- Next and Flutter consumers still use legacy provider-named initiation/status APIs.

These are migration constraints, not shapes to copy into the public SDK.

## 4. Market discovery contract

### `GET /pay/markets`

Public, cacheable discovery of markets the platform exposes:

```ts
interface Market {
  code: string                 // ISO 3166-1 alpha-2, e.g. "KE"
  name: string                 // "Kenya"
  status: 'active' | 'coming_soon'
  currency: {
    code: string               // ISO 4217, e.g. "KES"
    minor_unit: number         // e.g. 2
    symbol: string             // e.g. "KSh"
    locale: string             // e.g. "en-KE"
  }
  calling_code: string         // e.g. "+254"
  supported_methods: PaymentMethodType[] // informational, not checkout authority
}

interface MarketsResponse {
  version: 1
  markets: Market[]
  updated_at: string
}
```

`code`, currency codes, and method identifiers are open strings validated by format, not
closed country/provider enums. Adding a country does not require an SDK release.

`supported_methods` means generally supported in a market. Only a checkout session's
`available_methods` is authoritative for a specific payment.

## 5. Money and order migration

All new public contracts use:

```ts
interface Money {
  currency: string             // ISO 4217
  minor_units: number          // nonnegative Number.isSafeInteger
}
```

The backend migration should be additive:

1. Add authoritative markets and associate cities/subdivisions with `market_code`.
2. Add `market_code`, `currency_code`, and explicit minor-unit amount fields to listings,
   retail orders, and bale orders.
3. Backfill existing data as `KE` / `KES`; convert existing whole-KES values to minor units.
4. Dual-read/write during rollout; remove ambiguous/KES-specific fields only in a later
   breaking data migration.
5. Derive order market from listing/store location and validated delivery address. Never
   trust a cart total or currency submitted by the browser.

## 6. Checkout session

The long-term public authority is a short-lived checkout session. One V1 session represents
one payable subject, one market, one currency, and one authoritative total.

### Session creation

Marketplace order creation (buyer-authenticated or internal service call):

```http
POST /pay/checkout-sessions
Authorization: Bearer <buyer session>
```

```json
{
  "source": { "type": "order", "id": "ord_123" },
  "parent_origin": "https://marketplace.example",
  "return_url": "https://marketplace.example/orders/ord_123",
  "cancel_url": "https://marketplace.example/cart"
}
```

No country, amount, currency, email, or provider is submitted; all are order-derived.

External merchant creation is server-to-server and may supply an amount and market only
under merchant-secret authentication. Browser SDKs must never receive merchant secrets.
The external form is a later server API, not part of the initial browser package.

### Creation response

```ts
interface CreateCheckoutSessionResponse {
  version: 1
  session_id: string
  client_secret: string        // shown once; limited to this session
  expires_at: string
  hosted_url: string
}
```

The `client_secret` is an opaque, high-entropy value stored only as a hash server-side. It
is scoped to reading this session, initiating attempts, and reading status; it cannot call
marketplace/profile/order-management APIs. Default lifetime: 15 minutes. It is revocable
and unusable after terminal completion/expiry.

For hosted checkout, the iframe immediately exchanges the one-time client secret through a
same-origin `pay.mitumba.africa/api` endpoint for a `Secure`, `HttpOnly`, `SameSite=Lax`
session cookie, then clears the secret from JavaScript memory. The cookie is narrowly scoped
to checkout-session routes and expires with the session. This provides safe continuity when
a card flow performs top-level navigation: the provider returns to a non-secret URL such as
`https://pay.mitumba.africa/return/:session_id`, and the HttpOnly cookie authorizes the
status read. Neither the secret nor a bearer credential appears in the return URL or
localStorage.

If the session expires while open, the API returns an explicit expired response; the widget
clears client state and renders an expired state rather than guessing failure. On
`pagehide`/bfcache transitions it clears any remaining JS secret. A restored page re-reads
context using the HttpOnly session cookie or requests a fresh session from the parent.

## 7. Authoritative checkout context and available methods

### `GET /pay/checkout-sessions/:session_id`

Authenticated by the checkout-session client secret:

```ts
type KnownPaymentMethod = 'mobile_money' | 'card'
type PaymentMethodType = KnownPaymentMethod | (string & {})

interface CheckoutMethodDescriptor {
  type: PaymentMethodType
  display_name: string
  status: 'available' | 'temporarily_unavailable'
  input_fields: Array<{
    name: string               // "phone"
    type: 'tel' | 'text'
    required: boolean
    label: string
    calling_code?: string
    example?: string
  }>
}

interface CheckoutSessionContext {
  version: 1
  session_id: string
  session_status: 'open' | 'processing' | 'complete' | 'expired' | 'cancelled'
  market: { code: string; name: string }
  amount: Money
  line_items: Array<{ label: string; amount: Money }>
  reference: string
  available_methods: CheckoutMethodDescriptor[]
  parent_origin: string
  return_url: string | null
  cancel_url: string | null
  expires_at: string
  server_time: string
}
```

Rules:

- The UI renders only methods returned by this context.
- Provider names do not appear in method descriptors.
- The backend derives availability from the same controls used to authorize initiation.
- Initiation still validates availability to handle a race after context was loaded.
- Unknown method types remain parseable. A UI may show a server-provided generic action or
  report that its installed version cannot render a required input shape; it must not guess.

## 8. Attempt initiation and status

### `POST /pay/checkout-sessions/:session_id/attempts`

```json
{
  "idempotency_key": "intent_opaque",
  "method": { "type": "mobile_money", "phone": "+254712345678" }
}
```

Country is omitted. Phone is generic E.164 in the public SDK; the backend validates it
against the session market. Card submits no PAN, CVV, provider token, or buyer email.

Response preserves the current provider-neutral `next_action` model:

```ts
type CheckoutNextAction =
  | { type: 'await_confirmation' }
  | { type: 'redirect'; url: string; expires_at: string | null }
```

Session context and checkout status are distinct resources. Context describes immutable
checkout display/configuration plus `session_status`. A dedicated session status response
retains the existing aggregate payment semantics:

```ts
interface CheckoutSessionStatusResponse {
  version: 1
  session_id: string
  session_status: 'open' | 'processing' | 'complete' | 'expired' | 'cancelled'
  checkout_status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
  terminal: boolean
  retryable: boolean
  latest_attempt: CheckoutAttempt | null // existing public attempt projection
  server_time: string
  poll_after_ms: number
}
```

Attempt failure does not automatically fail the session: a retryable failed/cancelled
attempt returns the session to `open`; the client offers another attempt with a new key.
`complete`, `expired`, and session-level `cancelled` are terminal. Unknown/reconciliation
states remain `pending` and never become failure by elapsed client time alone.

Amounts use open ISO currency strings. Provider id may be returned as open diagnostic
metadata but never controls continuation. Money schemas require a nonnegative safe integer
(`Number.isSafeInteger`) so response validation rejects overflow or negative amounts.

A retryable attempt uses a new idempotency key. Recovery from an unknown initiation result
reuses the same key.

## 9. Hosted overlay and launcher

The SDK should expose a framework-neutral launcher (also re-exported from React):

```ts
const result = await openMitumbaPay({
  sessionId: session.session_id,
  clientSecret: session.client_secret,
})
```

The launcher owns:

- fixed, full-viewport iframe overlay creation and removal;
- `parent_origin` construction;
- READY/INIT version negotiation;
- exact `event.origin` checks in both directions;
- parent/launcher checks `event.source === iframe.contentWindow`;
- child/widget checks `event.source === window.parent`;
- close, Escape, status, completion, resize, and timeout cleanup;
- focus trapping/restoration and scroll locking;
- mobile viewport/safe-area behavior;
- redirect/return handling.

Bridge V2 passes only session id + client secret. It does not accept client-authored amount,
currency, country, methods, or line items. The widget loads all display data from session
context.

Bridge and wire-contract versions are checked before rendering or initiating. On mismatch,
the widget fails closed, emits a typed `MITUMBA_PAY_UPDATE_REQUIRED` event when an exact
parent origin is known, and renders a safe “Checkout update required” state. It never
silently downgrades, partially renders, or guesses unknown input fields.

The current V1 bridge remains compatibility-only while V2 rolls out.

## 10. Card and mobile-money UX

Mobile money:

1. Buyer enters/chooses an E.164 number permitted by session field metadata.
2. Widget initiates and follows `await_confirmation`.
3. Widget shows a focused phone-confirmation state and polls using `poll_after_ms` + jitter.
4. Timeout means “still confirming,” never payment failure.

Card:

1. Widget submits `{type:'card'}` and receives a validated HTTPS redirect.
2. Raw card fields never render in Mitumba Pay packages.
3. Because third-party checkout pages may deny iframe embedding, the launcher performs a
   top-level redirect by default and returns through the session's allowlisted return URL.
4. On return/re-entry, the client reads authoritative session status.

## 11. Security requirements

- Exact HTTPS parent origin stored on the session; no wildcard production origins.
- Checkout token is scoped, short-lived, hashed at rest, and cleared from iframe memory on
  close/complete.
- Tokens never appear in URL query strings, logs, analytics, localStorage, or errors.
- Session pages use `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, restrictive
  permissions policy, and a session-derived `frame-ancestors` CSP.
- Static hashed assets may be immutable/cacheable; checkout context may not.
- Hosted widget calls the API through a same-origin `/api` edge route or an explicit
  `pay.mitumba.africa` API CORS allowlist.
- Direct merchant-origin SDK calls require registered origin validation.
- The parent and child validate every message's version, origin, source, and payload.
- No third-party analytics executes on pages whose URLs or state contain session secrets.
- Backend remains authoritative for amount, currency, ownership, payability, method
  availability, idempotency, and terminal state.

## 12. Marketplace migration findings and decisions

Immediate defects to fix before adopting hosted checkout:

1. Upgrade the marketplace from `@mitumba/sdk` 1.27.x to a release containing authoritative
   checkout status (shipped in 1.28.0).
2. Replace fixed 3-second legacy polling and swallowed errors with `getCheckoutStatus` /
   server-authored polling semantics.
3. Flutter must stop turning a client deadline into payment failure.
4. Cart checkout currently creates multiple orders but navigates to only the first. V1
   hosted checkout remains one order/session; enforce a single-store cart or explicitly
   sequence sessions until grouped escrow funding is designed.
5. Delivery address selection currently occurs after order creation and is not attached to
   the order. Select/validate the address before creating the order, or atomically attach it
   before session creation.
6. Cart totals are display estimates only. Session/order totals from the backend are final.
7. Replace hardcoded KES, `en-KE`, counties, and `+254` assumptions with market/session data.

## 13. Operational blockers found during audit

These are deployment/security actions, not public SDK features:

- `api.mitumba.africa` does not currently resolve even though it is the public SDK default.
  Attach that custom domain to the gateway Worker before advertising the SDK, or temporarily
  use the deployed gateway URL.
- The provider-neutral route is deployed/reachable at the current gateway (an unauthenticated
  request returns 401), but authenticated DB/provider readiness still requires a rollout
  smoke test.
- Gateway CORS currently omits `https://pay.mitumba.africa`.
- A secret-shaped JWT value is committed in gateway configuration despite comments requiring
  secret storage. Rotate it, remove it from vars, store it as a Worker secret, and assess
  history exposure.
- Ensure the production gateway environment is labelled/configured as production.

## 14. Phased implementation order

### Phase 0 — Operational safety

1. Rotate/remove committed gateway JWT secret.
2. Attach `api.mitumba.africa` to the gateway and add hosted-widget CORS/same-origin routing.
3. Verify payment migrations and authenticated provider-neutral initiation in staging and
   production.
4. Migrate Next/Flutter status reads away from legacy polling.

### Phase 1 — Market and money foundation

1. Add markets contract and backend source of truth.
2. Add market/currency/minor-unit fields and backfill Kenya data.
3. Make listing, delivery address, order, and logistics validation market-aware.
4. Widen public currency and phone validation without breaking V1 consumers.

### Phase 2 — Checkout sessions

1. Add scoped session creation/context/status/attempt endpoints.
2. Return authoritative line items and available methods.
3. Add session-token auth, expiry, origin, CSP, and audit events.
4. Keep legacy order-based initiation/status as compatibility routes.

### Phase 3 — SDK and hosted launcher

1. Add session schemas to `@mitumba/pay-contract`.
2. Add session client methods and `openMitumbaPay()` to core/web exports.
3. Upgrade bridge to V2 and make the hosted widget context-driven.
4. Add redirect-return recovery and browser E2E tests.
5. Update native sheet to consume the same session context directly.

### Phase 4 — Consumer adoption

1. Fix address-before-order and single-store/multi-order behavior.
2. Adopt hosted overlay in Next marketplace.
3. Adopt native session flow in mobile; update Flutter or retire its legacy checkout.
4. Remove provider-named UI/API usage only after deployed clients have migrated.

### Phase 5 — External merchants

1. Add merchant accounts, restricted server API keys, origin registration, webhooks, and a
   server-side session-creation SDK.
2. Keep browser/native clients session-token-only.
3. Add sandbox, test payments, webhook signing, observability, and merchant-facing docs.

## 15. Non-negotiable invariants

1. Client selects market preference and payment method; backend validates market and selects
   provider.
2. Country, currency, amount, payability, and method availability are session-authoritative.
3. Adding a provider behind an existing method requires no SDK release.
4. Adding a market requires data/configuration, not client routing code.
5. A payment client never receives provider credentials or merchant secret keys.
6. Unknown server state is never converted into payment failure.
7. Hosted and native views render the same public session contract and lifecycle.
