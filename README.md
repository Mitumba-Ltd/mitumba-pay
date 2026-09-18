# Mitumba Pay

**Africa-native payment SDK.** M-Pesa, Airtel Money, card, and more — behind one
provider-neutral client. Headless core + React widget + React Native sheet. Built for
Mitumba, open for Africa.

> Mitumba Pay the *engine* (providers, credentials, escrow, settlement, routing) lives
> privately in `Mitumba-Ltd/mitumba` under `workers/pay/`. **This repository is the public
> client SDK.** It knows the *shape* of requests and responses — never how a payment is
> processed, and never a credential or provider implementation.

## Packages

| Package | What it is |
|---|---|
| [`@mitumba/pay-contract`](packages/contract) | Wire contract: types + zod schemas + version. The source of truth. |
| [`@mitumba/pay`](packages/core) | Headless, provider-neutral client + checkout state machine + polling. |
| [`@mitumba/pay-react`](packages/react) | React web payment widget (view over core). |
| [`@mitumba/pay-native`](packages/native) | React Native payment sheet (native view over core, no WebView). |

Private, unpublished apps: `apps/widget` (hosted widget → `pay.mitumba.africa/widget`) and
`apps/docs`.

## Quick start

```bash
npm install @mitumba/pay
```

```ts
import { MitumbaPay } from '@mitumba/pay'

const pay = new MitumbaPay({ token: () => getAccessToken() })

await pay.initiateCheckout({
  order_id: 'ord_123',
  idempotency_key: crypto.randomUUID(),
  method: { type: 'mobile_money', phone: '+254712345678' },
})

const final = await pay.pollCheckoutStatus('ord_123')
```

## The core principle

You pick a **method** (`mobile_money` or `card`). The backend picks the **provider**.
Provider identifiers are observable metadata, not routing choices — the backend can add
MTN MoMo, Vodacom, Paystack, etc. without an SDK release. Follow `next_action`, never a
provider `switch`.

## Development

```bash
npm install
npm run build       # turbo build all packages
npm run typecheck
npm run test
npm run lint
```

Releases go through [Changesets](https://github.com/changesets/changesets) with npm OIDC
Trusted Publishing and provenance — **no long-lived `NPM_TOKEN` is stored**. Each package
versions independently.

## License

MIT
