# @mitumba/pay-native

The React Native payment sheet for [Mitumba Pay](https://github.com/Mitumba-Ltd/mitumba-pay).
A **native** view layer over [`@mitumba/pay`](../core) — a bottom sheet that renders payment
UI in RN and drives the core state machine. **No WebView**: initiation and polling go
through the typed core client, keeping payment authority server-side per the Mitumba mobile
architecture.

```bash
npm install @mitumba/pay-native @mitumba/pay
# peers: react, react-native (host app pins exact versions)
```

## Usage

```tsx
import { useState } from 'react'
import { useCheckout, MitumbaPaySheet } from '@mitumba/pay-native'

function Checkout({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  const checkout = useCheckout({ token: () => getAccessToken() })

  return (
    <MitumbaPaySheet
      visible={open}
      checkout={checkout}
      amountLabel="KES 1,250"
      onClose={() => setOpen(false)}
      onPay={() =>
        checkout.start({
          order_id: orderId,
          idempotency_key: `${orderId}:${Date.now()}`,
          method: { type: 'mobile_money', phone: '+254712345678' },
        })
      }
    />
  )
}
```

Peer versions are intentionally permissive (`react >=18`, `react-native >=0.74`); host apps
(e.g. `mitumba-mobile`) pin exact versions and own their native peer closure.

Provider-neutral: pick a method, the backend picks the provider.

## License

MIT
