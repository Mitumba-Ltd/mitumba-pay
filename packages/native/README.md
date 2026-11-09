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
      // The market's phone rules, from your market registry (never hardcode a country).
      phoneFormat={{ callingCode: market.phone.calling_code, nationalLength: market.phone.national_length, example: market.phone.example }}
      networks={market.mobile_money_networks}
      defaultPhone="+254712345678"
      onClose={onClose}
      onPay={(input) => checkout.start({
        order_id: orderId,
        idempotency_key: `${orderId}:${Date.now()}`,
        method: input.method === 'mobile_money'
          ? { type: 'mobile_money', network: input.network, phone: input.phone }
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
- Mobile money asks which network the number pays from before the number; the session sheet lists
  one method per network, as the session returns them.
- Dedicated STK waiting, success, error, and retry states.
- Card checkout explains the secure redirect; raw card details never enter this package.

## Country-aware by the host's market

- **Phones:** pass `phoneFormat` (calling code, national lengths, example) from your market. The input then accepts local forms such as `0712 345 678` and sends E.164. Without it, only a full international number is accepted; nothing assumes Kenya.
- **Money:** `formatMoney(money, locale)` divides by the currency's own minor unit (KES 2, UGX 0), using the host market's locale.

## Payments temporarily unavailable

A 503 (payments paused by the platform, or the provider for the method unreachable) puts the hook in the `unavailable` phase, not `error`. `error.retryAfterMs` carries the server's `Retry-After`, and `unavailableMessage(ms)` gives the standard copy ("…Nothing was charged. Please try again in about 15 minutes."). Offer a retry; never show it as a failed payment.

## License

MIT
