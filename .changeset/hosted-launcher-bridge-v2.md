---
'@mitumba/pay-react': minor
---

Add the hosted-checkout launcher and Bridge V2 transport (RFC 0001):

- `openMitumbaPay()` — a framework-neutral launcher that mounts a fixed
  full-viewport iframe overlay, negotiates READY/INIT, and relays only a session
  id + client secret. Enforces exact widget-origin and `event.source` checks in
  both directions, scroll lock, focus restoration, Escape/close/complete/
  update-required handling, and a client timeout; resolves with a typed outcome.
- Bridge V2 protocol — the `MITUMBA_PAY_*` message envelope plus `isBridgeMessage`
  / `isBridgeInitMessage` guards. V2 carries only a session id + client secret, so
  no client-authored amount, currency, country, or methods crosses the boundary.

The widget loads all display data from session context. The legacy V1 bridge
remains compatibility-only.
