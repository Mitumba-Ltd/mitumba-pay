# @mitumba/pay-react

The React web payment widget for [Mitumba Pay](https://github.com/Mitumba-Ltd/mitumba-pay).
A thin view layer over [`@mitumba/pay`](../core) — the hook owns behavior, the components
own presentation.

```bash
npm install @mitumba/pay-react @mitumba/pay react react-dom
```

## Usage

```tsx
import { useCheckout, MitumbaPayWidget } from '@mitumba/pay-react'

function Checkout({ orderId }: { orderId: string }) {
  const checkout = useCheckout({ token: () => getAccessToken() })

  return (
    <MitumbaPayWidget
      checkout={checkout}
      amountLabel="KES 1,250"
      onPay={() =>
        checkout.start({
          order_id: orderId,
          idempotency_key: crypto.randomUUID(),
          method: { type: 'mobile_money', phone: '+254712345678' },
        })
      }
    />
  )
}
```

`useCheckout` drives the core state machine (initiate → poll → terminal), exposing a
`phase` (`idle | initiating | awaiting_confirmation | redirecting | polling | paid |
failed | retryable | timeout | error`), the latest `status`, and any `error`.

Provider-neutral: you pick a method, the backend picks the provider. Follow `next_action`,
never a provider switch.

## License

MIT
