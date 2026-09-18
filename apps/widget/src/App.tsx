import { useState } from 'react'
import { useCheckout, MitumbaPayWidget } from '@mitumba/pay-react'

/**
 * Public demo host for the Mitumba Pay web widget.
 *
 * SECURITY NOTE: this app is open source. It contains NO secrets. The access
 * token is supplied at runtime by the operator (below) or via a `VITE_PAY_TOKEN`
 * env var for local dev only — never committed. Order IDs are placeholders.
 */
export function App() {
  const [token, setToken] = useState<string>(import.meta.env.VITE_PAY_TOKEN ?? '')
  const [orderId, setOrderId] = useState('ord_demo_123')
  const [phone, setPhone] = useState('+254712345678')

  const pay = useCheckout({
    // baseUrl defaults to https://api.mitumba.africa
    token: () => token,
  })

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
      }}
    >
      <h1 style={{ color: '#3D9A52', margin: 0 }}>Mitumba Pay</h1>
      <p style={{ color: '#6B6B6B', marginTop: -12 }}>Web widget demo</p>

      <div style={{ display: 'grid', gap: 8, width: '100%', maxWidth: 420 }}>
        <label style={{ fontSize: 13, color: '#6B6B6B' }}>
          Access token (paste yours — never stored)
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Bearer token"
            style={inputStyle}
          />
        </label>
        <label style={{ fontSize: 13, color: '#6B6B6B' }}>
          Order ID
          <input value={orderId} onChange={(e) => setOrderId(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ fontSize: 13, color: '#6B6B6B' }}>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <MitumbaPayWidget
        checkout={pay}
        amountLabel="KES 1,250"
        onPay={() =>
          pay.start({
            order_id: orderId,
            idempotency_key: `${orderId}:${Date.now()}`,
            method: { type: 'mobile_money', phone },
          })
        }
      />
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  marginTop: 4,
  borderRadius: 8,
  border: '1px solid #E4E4E4',
  fontSize: 14,
  boxSizing: 'border-box',
}
