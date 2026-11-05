import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MitumbaGlass, MitumbaPrimaryButton, MitumbaThemeProvider } from '@mitumba/ui'
import {
  useCheckoutSession,
  type CheckoutMethodDescriptor,
  type SessionPaymentMethod,
} from '@mitumba/pay-react'
import {
  onInit,
  postToParent,
  readParentOrigin,
  CHILD_MESSAGE,
} from './session-bridge'
import './app.css'

/**
 * Session-driven hosted widget (RFC 0001 Bridge V2). The parent launcher passes
 * only a session id + client secret via INIT; the widget loads ALL display data
 * from the authoritative session context and renders the server-authored
 * available_methods. It never receives or trusts a client-authored amount,
 * currency, country, or method.
 */
export function SessionApp() {
  const parentOrigin = useMemo(readParentOrigin, [])
  const [creds, setCreds] = useState<{ sessionId: string; clientSecret: string } | null>(null)

  // Announce readiness and wait for the parent's INIT (session id + secret).
  useEffect(() => {
    const off = onInit(parentOrigin, (payload) =>
      setCreds({ sessionId: payload.session_id, clientSecret: payload.client_secret }),
    )
    postToParent(parentOrigin, CHILD_MESSAGE.ready, { embedded: true })
    return off
  }, [parentOrigin])

  if (!creds) {
    return (
      <MitumbaThemeProvider disableCssBaseline>
        <main className="widget-waiting">
          <MitumbaGlass blur={26} opacity={0.84} rounding="huge" role="status" sx={{ width: 'min(420px, 100%)' }}>
            <div className="widget-waiting-content">
              <span className="widget-waiting-mark">M</span>
              <h1>Mitumba Pay</h1>
              <p>Secure checkout is getting ready. This usually takes only a moment.</p>
            </div>
          </MitumbaGlass>
        </main>
      </MitumbaThemeProvider>
    )
  }

  return <SessionCheckout parentOrigin={parentOrigin} sessionId={creds.sessionId} clientSecret={creds.clientSecret} />
}

function SessionCheckout({
  parentOrigin,
  sessionId,
  clientSecret,
}: {
  parentOrigin: string | null
  sessionId: string
  clientSecret: string
}) {
  const config = useMemo(() => ({ baseUrl: undefined }), [])
  const checkout = useCheckoutSession(config, sessionId, clientSecret)
  const idempotencyKey = useRef<string>(crypto.randomUUID())
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  // Load the authoritative context once on mount.
  const loadContext = checkout.loadContext
  useEffect(() => {
    void loadContext()
  }, [loadContext])

  const methods = checkout.context?.available_methods ?? []
  useEffect(() => {
    if (!selectedType && methods.length > 0) setSelectedType(methods[0]!.type)
  }, [methods, selectedType])

  // Relay lifecycle to the parent; emit COMPLETE on paid.
  useEffect(() => {
    postToParent(parentOrigin, CHILD_MESSAGE.status, {
      phase: checkout.phase,
      checkout_status: checkout.status?.checkout_status ?? null,
    })
    if (checkout.phase === 'paid') {
      postToParent(parentOrigin, CHILD_MESSAGE.complete, checkout.status)
    }
  }, [checkout.phase, checkout.status, parentOrigin])

  const close = useCallback(() => postToParent(parentOrigin, CHILD_MESSAGE.close), [parentOrigin])

  const selected = methods.find((m) => m.type === selectedType) ?? null
  const requiredFields = selected?.input_fields.filter((f) => f.required) ?? []
  const fieldsComplete = requiredFields.every((f) => (fieldValues[f.name] ?? '').trim().length > 0)
  const busy =
    checkout.phase === 'loading_context' ||
    checkout.phase === 'initiating' ||
    checkout.phase === 'polling' ||
    checkout.phase === 'redirecting' ||
    checkout.phase === 'awaiting_confirmation'
  const done = checkout.phase === 'paid'
  const methodUnavailable = selected?.status === 'temporarily_unavailable'
  const disabled = busy || done || !selected || methodUnavailable || !fieldsComplete

  const submit = () => {
    if (!selected) return
    const method = buildMethod(selected, fieldValues)
    if (!method) return
    void checkout.pay(method, idempotencyKey.current)
  }

  const amountLabel = checkout.context
    ? formatAmount(
        checkout.context.amount.minor_units,
        checkout.context.amount.currency,
        checkout.context.market.code,
      )
    : ''

  return (
    <MitumbaThemeProvider disableCssBaseline>
      <main className="widget-overlay is-embedded">
        <div className="widget-stage">
          <MitumbaGlass blur={20} opacity={0.9} rounding="huge" sx={{ width: 'min(460px, 100%)', p: 3 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Mitumba Pay</strong>
              <button type="button" aria-label="Close payment" onClick={close} style={closeStyle}>×</button>
            </header>

            <p style={{ color: '#6B6B65', fontSize: 12, margin: '12px 0 2px' }}>AMOUNT DUE</p>
            <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{amountLabel || '…'}</p>
            {checkout.context ? (
              <p style={{ color: '#6B6B65', fontSize: 12 }}>Ref · {checkout.context.reference}</p>
            ) : null}

            {done ? (
              <p role="status" style={{ marginTop: 20 }}>Payment received. Your order is confirmed.</p>
            ) : checkout.phase === 'error' ? (
              <p role="alert" style={{ marginTop: 20, color: '#B3261E' }}>
                {checkout.error?.message ?? 'We couldn’t load this checkout.'}
              </p>
            ) : (
              <>
                <div role="radiogroup" aria-label="Payment method" style={{ marginTop: 18, display: 'grid', gap: 8 }}>
                  {methods.map((m) => {
                    const active = m.type === selectedType
                    const unavailable = m.status === 'temporarily_unavailable'
                    return (
                      <button
                        key={m.type}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-disabled={unavailable}
                        disabled={unavailable}
                        onClick={() => setSelectedType(m.type)}
                        style={methodStyle(active, unavailable)}
                      >
                        <span>{m.display_name}</span>
                        {unavailable ? <small> · Temporarily unavailable</small> : null}
                      </button>
                    )
                  })}
                </div>

                {selected && !methodUnavailable
                  ? selected.input_fields.map((field) => (
                      <label key={field.name} style={{ display: 'block', marginTop: 14 }}>
                        <span style={{ fontSize: 12, color: '#6B6B65' }}>{field.label}</span>
                        <input
                          value={fieldValues[field.name] ?? ''}
                          onChange={(e) =>
                            setFieldValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                          }
                          placeholder={field.example ?? ''}
                          inputMode={field.type === 'tel' ? 'tel' : 'text'}
                          disabled={busy}
                          style={inputStyle}
                        />
                      </label>
                    ))
                  : null}

                <div style={{ marginTop: 20 }}>
                  <MitumbaPrimaryButton
                    label={busy ? 'Processing…' : amountLabel ? `Pay ${amountLabel}` : 'Pay'}
                    disabled={disabled}
                    onClick={submit}
                  />
                </div>
              </>
            )}
          </MitumbaGlass>
        </div>
      </main>
    </MitumbaThemeProvider>
  )
}

/** Map a method descriptor + collected fields into the typed SessionPaymentMethod. */
function buildMethod(
  descriptor: CheckoutMethodDescriptor,
  values: Record<string, string>,
): SessionPaymentMethod | null {
  if (descriptor.type === 'card') return { type: 'card' }
  if (descriptor.type === 'mobile_money') {
    const phone = (values.phone ?? '').trim()
    return phone ? { type: 'mobile_money', phone } : null
  }
  return null
}

function formatAmount(minorUnits: number, currency: string, marketCode: string): string {
  const major = minorUnits / 100
  try {
    return new Intl.NumberFormat(marketCode === 'KE' ? 'en-KE' : undefined, {
      style: 'currency',
      currency,
    }).format(major)
  } catch {
    return `${currency} ${major.toFixed(2)}`
  }
}

const closeStyle: React.CSSProperties = {
  border: 0,
  background: 'rgba(0,0,0,0.06)',
  width: 32,
  height: 32,
  borderRadius: 16,
  fontSize: 20,
  cursor: 'pointer',
}
const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 6,
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #E0E0DC',
  fontSize: 16,
}
function methodStyle(active: boolean, unavailable: boolean): React.CSSProperties {
  return {
    textAlign: 'left',
    padding: '14px 16px',
    borderRadius: 12,
    border: `1px solid ${active ? '#3D9A52' : '#E0E0DC'}`,
    background: active ? '#EAF5EC' : '#FFFFFF',
    opacity: unavailable ? 0.5 : 1,
    cursor: unavailable ? 'not-allowed' : 'pointer',
    fontSize: 14,
    fontWeight: 600,
  }
}
