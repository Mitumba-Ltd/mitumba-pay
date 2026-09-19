import { useState } from 'react'
import { useCheckout, MitumbaPayWidget, type WidgetMethod } from '@mitumba/pay-react'

/**
 * Public demo host for the Mitumba Pay web widget.
 *
 * SECURITY NOTE: this app is open source and contains NO secrets. The access
 * token is supplied at runtime by the operator (or via VITE_PAY_TOKEN for local
 * dev only, never committed). Order IDs are placeholders.
 */
export function App() {
  const [token, setToken] = useState<string>(import.meta.env.VITE_PAY_TOKEN ?? '')
  const [orderId, setOrderId] = useState('ord_demo_123')

  const pay = useCheckout({
    // baseUrl defaults to https://api.mitumba.africa
    token: () => token,
  })

  const handlePay = (input: { method: WidgetMethod; phone?: string }) => {
    pay.start({
      order_id: orderId,
      idempotency_key: `${orderId}:${Date.now()}`,
      method:
        input.method === 'mobile_money'
          ? { type: 'mobile_money', phone: input.phone ?? '' }
          : { type: 'card' },
    })
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
        background: '#F5F5F3',
      }}
    >
      <div style={{ display: 'grid', gap: 8, width: '100%', maxWidth: 780 }}>
        <label style={{ fontSize: 12, color: '#6B6B6B' }}>
          Demo access token (paste yours — never stored)
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Bearer token"
            style={demoInput}
          />
        </label>
        <label style={{ fontSize: 12, color: '#6B6B6B' }}>
          Order ID
          <input value={orderId} onChange={(e) => setOrderId(e.target.value)} style={demoInput} />
        </label>
      </div>

      <MitumbaPayWidget
        checkout={pay}
        amountLabel="KES 600.99"
        lineItems={[
          { label: 'Subtotal', value: 'KES 599.00' },
          { label: 'Commission', value: 'KES 1.99' },
        ]}
        totalLabel="KES 600.99"
        orderId={orderId}
        onPay={handlePay}
      />
    </main>
  )
}

const demoInput: React.CSSProperties = {
  width: '100%',
  padding: 10,
  marginTop: 4,
  borderRadius: 8,
  border: '1px solid #E4E4E4',
  fontSize: 14,
  boxSizing: 'border-box',
}
