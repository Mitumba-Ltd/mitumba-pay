# @mitumba/pay

Headless, provider-neutral payment client for Africa — M-Pesa, Airtel Money, card, and
more. Zero UI. Zero provider knowledge. Zero secrets.

```bash
npm install @mitumba/pay
```

## Usage

```ts
import { MitumbaPay } from '@mitumba/pay'

const pay = new MitumbaPay({
  // baseUrl defaults to https://api.mitumba.africa
  token: () => getAccessToken(), // your app owns auth
})

// 1) Initiate — the caller picks a METHOD, the backend picks the provider.
const { next_action } = await pay.initiateCheckout({
  order_id: 'ord_123',
  idempotency_key: crypto.randomUUID(),
  method: { type: 'mobile_money', phone: '+254712345678' },
})

// 2) Continue based on next_action.
if (next_action.type === 'redirect') {
  window.location.href = next_action.url
}

// 3) Poll the authoritative lifecycle (honors server poll_after_ms + jitter).
const final = await pay.pollCheckoutStatus('ord_123', {
  onUpdate: (s) => console.log(s.checkout_status),
})
```

## Design

- **Provider-neutral.** You never name a provider. Follow `next_action`, never a
  provider switch. The backend can add providers without an SDK release.
- **Auth-agnostic.** Supply a `token` (string or getter). The SDK does not do JWT
  refresh rotation — that is the host application's concern.
- **Contract-validated.** Requests and responses are validated against
  [`@mitumba/pay-contract`](../contract) with zod.

> `initiateCheckout` targets `POST /pay/checkout/initiate`, whose backend route may be
> pending deployment in some environments — verify before production use.
> `getCheckoutStatus` is live.

## License

MIT
