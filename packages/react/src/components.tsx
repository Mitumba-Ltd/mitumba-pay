import { useState, type CSSProperties, type ReactNode } from 'react'
import { payTheme as t } from './theme'
import { type UseCheckoutResult, type CheckoutPhase } from './useCheckout'

export interface MitumbaPayButtonProps {
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  children?: ReactNode
  style?: CSSProperties
}

/** Branded full-width primary action button. */
export function MitumbaPayButton({
  onClick,
  disabled,
  loading,
  children = 'Pay',
  style,
}: MitumbaPayButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={{
        appearance: 'none',
        border: 'none',
        width: '100%',
        padding: '16px',
        borderRadius: t.radius.md,
        background: isDisabled ? t.color.greenDark : t.color.green,
        color: t.color.onGreen,
        fontFamily: t.font.family,
        fontSize: 16,
        fontWeight: 700,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.8 : 1,
        transition: 'background 120ms ease, opacity 120ms ease',
        ...style,
      }}
    >
      {loading ? 'Processing…' : children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Split-panel checkout widget
// ---------------------------------------------------------------------------

/** A method the widget offers. Tabs pick a METHOD, never a provider. */
export type WidgetMethod = 'mobile_money' | 'card'

export interface MitumbaPayWidgetProps {
  checkout: UseCheckoutResult
  /** Amount to display, e.g. "KES 1,250". */
  amountLabel: string
  /** Optional line items shown on the summary panel. */
  lineItems?: { label: string; value: string }[]
  totalLabel?: string
  /** Shown on the summary panel. */
  orderId?: string
  /** Called with the chosen method + phone (for mobile_money) when the user pays. */
  onPay: (input: { method: WidgetMethod; phone?: string }) => void
  /** Methods to offer, in order. Defaults to mobile_money first (Kenya market). */
  methods?: WidgetMethod[]
  supportLabel?: string
  style?: CSSProperties
}

const PHASE_MESSAGE: Record<CheckoutPhase, string> = {
  idle: '',
  initiating: 'Starting your payment…',
  awaiting_confirmation: 'Check your phone and enter your M-Pesa/Airtel PIN to confirm.',
  redirecting: 'Redirecting you to complete payment…',
  polling: 'Confirming your payment…',
  paid: 'Payment received. Thank you!',
  failed: 'That payment didn’t go through.',
  retryable: 'Payment wasn’t completed. You can try again.',
  timeout: 'Still confirming — this can take a moment.',
  error: 'We couldn’t start the payment.',
}

const METHOD_LABEL: Record<WidgetMethod, string> = {
  mobile_money: 'Mobile Payment',
  card: 'Card',
}

export function MitumbaPayWidget({
  checkout,
  amountLabel,
  lineItems = [],
  totalLabel,
  orderId,
  onPay,
  methods = ['mobile_money', 'card'],
  supportLabel = 'Online chat 24/7',
  style,
}: MitumbaPayWidgetProps) {
  const [method, setMethod] = useState<WidgetMethod>(methods[0] ?? 'mobile_money')
  const [phone, setPhone] = useState('')

  const { phase, error } = checkout
  const busy = phase === 'initiating' || phase === 'polling' || phase === 'redirecting'
  const done = phase === 'paid'
  const showRetry = phase === 'retryable' || phase === 'failed' || phase === 'error'
  const message = phase === 'error' && error ? error.message : PHASE_MESSAGE[phase]
  const phoneValid = /^\+254\d{9}$/.test(phone)
  const canPay = !busy && !done && (method !== 'mobile_money' || phoneValid)

  return (
    <section
      role="group"
      aria-label="Mitumba Pay checkout"
      style={{
        fontFamily: t.font.family,
        color: t.color.ink,
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 320px) 1fr',
        maxWidth: 780,
        width: '100%',
        borderRadius: t.radius.lg,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        background: t.color.surface,
        ...style,
      }}
    >
      {/* Summary panel */}
      <aside
        style={{
          background: t.color.green,
          color: t.color.onGreen,
          padding: t.space.lg,
          display: 'flex',
          flexDirection: 'column',
          gap: t.space.lg,
          minHeight: 380,
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700 }}>{amountLabel}</div>

        {lineItems.length > 0 || totalLabel ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.sm }}>
            {lineItems.map((li) => (
              <Row key={li.label} label={li.label} value={li.value} />
            ))}
            {totalLabel ? <Row label="Total" value={totalLabel} strong /> : null}
          </div>
        ) : null}

        {orderId ? (
          <div style={{ marginTop: 'auto' }}>
            <div style={{ fontSize: 12, color: t.color.onGreenMuted }}>Order ID</div>
            <div style={{ fontSize: 15, fontWeight: 600, wordBreak: 'break-all' }}>{orderId}</div>
          </div>
        ) : null}

        <div style={{ fontSize: 12, color: t.color.onGreenMuted }}>
          <div style={{ fontWeight: 700, color: t.color.onGreen }}>Customer Support</div>
          {supportLabel}
        </div>
      </aside>

      {/* Form panel */}
      <div style={{ padding: t.space.lg, display: 'flex', flexDirection: 'column', gap: t.space.md }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Payment method</h2>

        {/* Method tabs — pick a METHOD, never a provider */}
        <div role="tablist" aria-label="Payment method" style={{ display: 'flex', gap: t.space.md, borderBottom: `1px solid ${t.color.border}` }}>
          {methods.map((m) => {
            const active = m === method
            return (
              <button
                key={m}
                role="tab"
                aria-selected={active}
                onClick={() => setMethod(m)}
                disabled={busy || done}
                style={{
                  appearance: 'none',
                  background: 'none',
                  border: 'none',
                  padding: '8px 0',
                  marginBottom: -1,
                  fontFamily: t.font.family,
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? t.color.green : t.color.muted,
                  borderBottom: `2px solid ${active ? t.color.green : 'transparent'}`,
                  cursor: busy || done ? 'default' : 'pointer',
                }}
              >
                {METHOD_LABEL[m]}
              </button>
            )
          })}
          <span style={{ padding: '8px 0', fontSize: 14, color: t.color.faint }}>+ More</span>
        </div>

        {/* Method body */}
        {!done ? (
          method === 'mobile_money' ? (
            <label style={{ fontSize: 13, color: t.color.muted }}>
              Phone number
              <input
                inputMode="tel"
                placeholder="+2547XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.trim())}
                disabled={busy}
                style={fieldStyle}
              />
              <span style={{ fontSize: 12, color: t.color.faint }}>
                We’ll send an STK prompt to this number.
              </span>
            </label>
          ) : (
            <p style={{ fontSize: 14, color: t.color.muted, margin: 0 }}>
              You’ll be redirected to a secure page to complete your card payment.
            </p>
          )
        ) : null}

        {/* Status message */}
        {message ? (
          <p
            role="status"
            aria-live="polite"
            style={{
              margin: 0,
              fontSize: 14,
              padding: '10px 12px',
              borderRadius: t.radius.sm,
              background: done ? t.color.greenSoft : t.color.field,
              color: done ? t.color.green : t.color.muted,
            }}
          >
            {message}
          </p>
        ) : null}

        {/* Action */}
        {!done ? (
          <div style={{ marginTop: 'auto' }}>
            <MitumbaPayButton
              onClick={() => onPay(method === 'mobile_money' ? { method, phone } : { method })}
              loading={busy}
              disabled={!canPay}
            >
              {showRetry ? 'Try again' : `Pay ${amountLabel}`}
            </MitumbaPayButton>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: t.space.md }}>
      <span style={{ fontSize: 13, color: strong ? t.color.onGreen : t.color.onGreenMuted, fontWeight: strong ? 700 : 400 }}>
        {label}
      </span>
      <span style={{ fontSize: strong ? 15 : 13, fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  )
}

const fieldStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 6,
  marginBottom: 4,
  padding: '12px',
  borderRadius: t.radius.md,
  border: `1px solid ${t.color.border}`,
  background: t.color.field,
  fontSize: 15,
  fontFamily: t.font.family,
}
