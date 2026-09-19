# @mitumba/pay-native

A genuinely native, mobile-first React Native checkout sheet over `@mitumba/pay`.
**No WebView:** initiation and polling use the typed core client directly.

```bash
npm install @mitumba/pay-native @mitumba/pay
```

The host app supplies the `react` and `react-native` peers and pins versions compatible
with its Expo/RN release.

```tsx
import { useCheckout, MitumbaPaySheet } from '@mitumba/pay-native'

function Checkout({ visible, orderId, token, onClose }) {
  const checkout = useCheckout({ token: () => token })

  return (
    <MitumbaPaySheet
      visible={visible}
      checkout={checkout}
      amountLabel="KES 6,000.00"
      orderId={orderId}
      lineItems={[{ label: 'Delivery', value: 'KES 150.00' }]}
      defaultPhone="+254712345678"
      onClose={onClose}
      onPay={({ method = 'mobile_money', phone } = {}) => checkout.start({
        order_id: orderId,
        idempotency_key: `${orderId}:${Date.now()}`,
        method: method === 'mobile_money'
          ? { type: 'mobile_money', phone: phone! }
          : { type: 'card' },
      })}
    />
  )
}
```

## UX

- Green amount/order hero preserves checkout context.
- Rounded, scroll-safe white action sheet keeps controls in the thumb zone.
- Large method cards select a method only, never a provider.
- Dedicated STK waiting, success, error, and retry states.
- Card checkout explains the secure redirect; raw card details never enter this package.

## License

MIT
