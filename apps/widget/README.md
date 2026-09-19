# Hosted Mitumba Pay widget

The official Vite host for `@mitumba/pay-react`, deployed at
`https://pay.mitumba.africa/widget/`. It is private to npm (`private: true`) but its
source is intentionally public.

## Integration model

Embed the widget as a full-viewport iframe overlay. **Never place an access token in the
URL.** The parent sends checkout configuration through the versioned, origin-checked
`postMessage` bridge after receiving `MITUMBA_PAY_READY`.

```ts
const iframe = document.createElement('iframe')
iframe.src = `https://pay.mitumba.africa/widget/?parent_origin=${encodeURIComponent(location.origin)}`
iframe.allow = 'payment'
Object.assign(iframe.style, {
  position: 'fixed', inset: '0', width: '100%', height: '100%', border: '0', zIndex: '2147483000',
})
document.body.append(iframe)

window.addEventListener('message', (event) => {
  if (event.origin !== 'https://pay.mitumba.africa' || event.source !== iframe.contentWindow) return

  if (event.data?.type === 'MITUMBA_PAY_READY') {
    iframe.contentWindow?.postMessage({
      type: 'MITUMBA_PAY_INIT',
      version: 1,
      payload: {
        orderId: 'ord_123',
        token: await getShortLivedAccessToken(),
        amountLabel: 'KES 6,000.00',
        lineItems: [{ label: 'Delivery', value: 'KES 150.00' }],
        defaultPhone: '+254712345678',
      },
    }, 'https://pay.mitumba.africa')
  }

  if (event.data?.type === 'MITUMBA_PAY_CLOSE') iframe.remove()
  if (event.data?.type === 'MITUMBA_PAY_COMPLETE') iframe.remove()
})
```

Outgoing messages: `MITUMBA_PAY_READY`, `MITUMBA_PAY_STATUS`,
`MITUMBA_PAY_COMPLETE`, `MITUMBA_PAY_CLOSE`, `MITUMBA_PAY_RESIZE`.

The token exists only in iframe memory for the checkout lifetime and is cleared on close.
The bridge accepts messages only from `window.parent` and requires an exact HTTP(S) parent
origin derived from `document.referrer` or the explicit non-secret `parent_origin` query
parameter. If the host suppresses referrers, `parent_origin` is mandatory; without a known
origin the widget fails closed and neither accepts initialization nor broadcasts events.

## Design-system boundary

The official hosted shell selectively uses `@mitumba/ui` (`MitumbaThemeProvider`,
`MitumbaGlass`, and `MitumbaPrimaryButton`). The portable `@mitumba/pay-react` package
does not depend on MUI/Next, so third-party SDK consumers keep a lightweight runtime.

## Develop

```bash
npm run dev -w @mitumba/pay-widget-app
```

Opening the URL directly shows a safe visual preview. Embedded mode waits for the parent
initialization message and never exposes token/order controls in the UI.
