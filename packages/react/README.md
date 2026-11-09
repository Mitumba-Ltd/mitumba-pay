# @mitumba/pay-react

Responsive React checkout UI for Mitumba Pay. A thin view over `@mitumba/pay`: the core
owns payment behavior; this package owns accessible, provider-neutral presentation.

```bash
npm install @mitumba/pay-react @mitumba/pay react react-dom
```

## Responsive design

- **Desktop:** green order-summary panel + white payment-method panel.
- **Mobile:** amount hero + rounded white action sheet; no squeezed columns.
- Method tabs select `mobile_money` or `card`, never a provider.
- Card details are entered on the backend-supplied secure redirect. This widget never
  collects or stores PAN/CVV.

```tsx
import { useCheckout, MitumbaPayWidget } from '@mitumba/pay-react'

function Checkout({ orderId, token }: { orderId: string; token: string }) {
  const checkout = useCheckout({ token: () => token })

  return (
    <MitumbaPayWidget
      checkout={checkout}
      amountLabel="KES 6,000.00"
      orderId={orderId}
      lineItems={[
        { label: 'Subtotal', value: 'KES 5,850.00' },
        { label: 'Delivery', value: 'KES 150.00' },
      ]}
      // The market's phone rules, from your market registry (never hardcode a country).
      phoneFormat={{ callingCode: market.phone.calling_code, nationalLength: market.phone.national_length, example: market.phone.example }}
      defaultPhone="+254712345678"
      onPay={({ method, phone }) => checkout.start({
        order_id: orderId,
        idempotency_key: crypto.randomUUID(),
        method: method === 'mobile_money'
          ? { type: 'mobile_money', phone: phone! }
          : { type: 'card' },
      })}
    />
  )
}
```

`useCheckout` exposes `idle | initiating | awaiting_confirmation | redirecting | polling |
paid | failed | retryable | timeout | error`. The widget renders dedicated waiting,
success, and retry states.

For the official iframe overlay and versioned `postMessage` contract, see
[`apps/widget`](../../apps/widget).

## Country-aware by the host's market

- **Phones:** pass `phoneFormat` (calling code, national lengths, example) from your market. The input then accepts local forms such as `0712 345 678` and sends E.164. Without it, only a full international number is accepted; nothing assumes Kenya.
- **Money:** `formatMoney(money, locale)` divides by the currency's own minor unit (KES 2, UGX 0), using the host market's locale.

## Payments temporarily unavailable

A 503 (payments paused by the platform, or the provider for the method unreachable) puts the hook in the `unavailable` phase, not `error`. `error.retryAfterMs` carries the server's `Retry-After`, and `unavailableMessage(ms)` gives the standard copy ("…Nothing was charged. Please try again in about 15 minutes."). Offer a retry; never show it as a failed payment.

## License

MIT
