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
  method: { type: 'mobile_money', network: 'mpesa', phone: '+254712345678' },
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

## Market-driven helpers

- `normalizePhone(input, { callingCode, nationalLength?, example? })` turns what a person typed into E.164 for the market, or null. `isValidPhone` and `nationalPart` sit beside it.
- `formatMoney(money, locale?)` and `currencyDigits(currency)` format `Money` by the currency's own minor unit.

## Errors

`PayError` carries `status`, `code` and, on 503 or 429, `retryAfterMs` from `Retry-After`. `isUnavailable` is true on 503 (`payment_initiation_paused`, `payment_provider_unavailable`): nothing was charged, so retry later. A GET never waits less than the server asked, and a 503 that names a long wait is surfaced at once.

## Saved payment methods

The buyer's own mobile-money numbers, per market, as one-tap choices at checkout:

```ts
const { data } = await pay.paymentMethods.list('KE') // default first
await pay.paymentMethods.save({ market_code: 'KE', method: { type: 'mobile_money', network: 'airtel_money', phone: '0733 000 222' } })
await pay.paymentMethods.setDefault(id)
await pay.paymentMethods.remove(id)
// Pass the market's networks so a renamed number still says which wallet it pays from.
const choices = savedPhoneChoices(data, market.mobile_money_networks)
// [{ label: 'M-Pesa ••• 678', value: '+254712345678', network: 'mpesa', is_default: true },
//  { label: 'Work · Airtel Money ••• 222', value: '+254733000222', network: 'airtel_money', is_default: false }]
```

Pass a saved method's `method` to `initiateCheckout` or `createAttempt` unchanged. Saving a number that is already saved returns the existing entry instead of a duplicate. Cards cannot be saved (`422 payment_method_not_savable`) until a provider issues reusable tokens.

## License

MIT
