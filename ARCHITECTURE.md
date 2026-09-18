# Mitumba Pay — Architecture

## The boundary

`Mitumba-Ltd/mitumba` → `workers/pay/` **is** the payment engine. It owns every provider
implementation (Daraja, Airtel, Intasend, Paystack, and future MTN MoMo / Vodacom), every
credential and webhook secret, escrow/settlement logic, and country + method routing. It
stays private and grows there forever.

**This repository is a thin public client SDK.** It:

- knows the shape of requests/responses (the contract),
- **never** contains a provider implementation,
- **never** contains a credential, secret, or routing rule,
- **never** needs to change when the backend adds a country or provider.

If building a feature here ever requires knowing *how* a payment is processed rather than
*what* to send and *what* comes back, stop — that means the backend's public API isn't
cleanly separated yet, and it must be fixed there, not worked around here.

## Layering

```
@mitumba/pay-contract   types + zod schemas + version   (zero deps but zod)
        ▲
@mitumba/pay            HTTP client + checkout state machine + polling
        ▲                        (framework-agnostic, auth-agnostic)
   ┌────┴─────┐
@mitumba/pay-react   @mitumba/pay-native
  (web view)           (RN native view — no WebView)
```

**Core owns behavior; view packages own presentation.** The web widget and the native
sheet are two renderings of the *same* state machine in core (`useCheckout` phases:
`idle → initiating → awaiting_confirmation | redirecting → polling → paid | failed |
retryable | timeout | error`). We deliberately did **not** implement the native layer as a
WebView loading the web widget: that would fight the Mitumba mobile app's boundaries
("no direct transport", "payment stays server-side via the SDK contract") and its New
Architecture stack. Instead, native renders in RN and calls `@mitumba/pay` directly.

## Contract endpoints

- `POST /pay/checkout/initiate` → `initiateCheckout` — provider-neutral initiation.
  **Backend route may be pending deployment**; verify before production use.
- `GET /pay/checkout-status/:order_id` → `getCheckoutStatus` — authoritative polling
  lifecycle (live). Honors server-authored `poll_after_ms` with client jitter.

Every response carries `version: 1`. Compatibility is keyed off that field, not the URL
(the HTTP API is currently unversioned at the path level).

## Auth model

Core is auth-agnostic: supply a bearer `token` (string or getter). It does **not** perform
JWT refresh rotation — token acquisition/refresh is the host application's concern. This
keeps the SDK lean and usable outside the Mitumba marketplace.

## Default base URL

`https://api.mitumba.africa`, overridable via config.

## Release

Changesets, independent per-package versioning, npm OIDC Trusted Publishing + provenance,
no stored `NPM_TOKEN`. Private apps (`apps/widget`, `apps/docs`) are in the Changesets
`ignore` list.
