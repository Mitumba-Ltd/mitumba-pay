import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { MitumbaGlass, MitumbaThemeProvider } from '@mitumba/ui'
import { useCheckout, MitumbaPayWidget, type WidgetPayInput } from '@mitumba/pay-react'
import {
  MESSAGE,
  isInitMessage,
  parentOrigin,
  postToParent,
  type HostedCheckoutConfig,
} from './bridge'
import { onInit as onSessionInit, postToParent as postToSessionParent, CHILD_MESSAGE } from './session-bridge'
import { SessionApp, WaitingCard, INIT_TIMEOUT_MS, type SessionCredentials } from './SessionApp'
import './app.css'

const PREVIEW: HostedCheckoutConfig = {
  orderId: 'ORD-2048-KE',
  token: '',
  amountLabel: 'KES 6,000.00',
  lineItems: [
    { label: 'Order subtotal', value: 'KES 5,850.00' },
    { label: 'Delivery', value: 'KES 150.00' },
  ],
  totalLabel: 'KES 6,000.00',
  metadata: [{ label: 'Payment protection', value: 'Funds held securely until delivery' }],
  merchantName: 'Mitumba',
  defaultPhone: '+254712345678',
  savedPhones: [
    { label: 'M-Pesa ••• 678', value: '+254712345678', network: 'mpesa' },
    { label: 'Work · Airtel Money ••• 042', value: '+254733331042', network: 'airtel_money' },
  ],
  methods: ['mobile_money', 'card'],
  networks: [
    { id: 'mpesa', name: 'M-Pesa' },
    { id: 'airtel_money', name: 'Airtel Money' },
  ],
  defaultNetwork: 'mpesa',
  supportLabel: 'Available 24/7',
}

export function App() {
  const embedded = window.parent !== window
  const initialOrigin = useMemo(parentOrigin, [])
  const [replyOrigin, setReplyOrigin] = useState<string | null>(initialOrigin)
  const [config, setConfig] = useState<HostedCheckoutConfig | null>(embedded ? null : PREVIEW)
  // A Bridge V2 parent that opened the widget without ?session= is handed to the session app.
  const [sessionCreds, setSessionCreds] = useState<SessionCredentials | null>(null)
  const idempotencyKey = useRef<string | null>(null)

  const clientConfig = useMemo(
    () => ({ baseUrl: config?.baseUrl, token: () => config?.token }),
    [config?.baseUrl, config?.token],
  )
  const checkout = useCheckout(clientConfig)
  const close = useCallback(() => {
    checkout.cancel()
    postToParent(replyOrigin, MESSAGE.close)
    if (embedded && !config) postToSessionParent(replyOrigin, CHILD_MESSAGE.close)
    if (embedded) setConfig(null)
  }, [checkout.cancel, config, embedded, replyOrigin])

  const [initTimedOut, setInitTimedOut] = useState(false)
  useEffect(() => {
    if (!embedded || config || sessionCreds) return
    const timer = setTimeout(() => setInitTimedOut(true), INIT_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [config, embedded, sessionCreds])

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || !isInitMessage(event.data)) return
      if (!initialOrigin || event.origin !== initialOrigin) return
      setReplyOrigin(event.origin)
      setConfig(event.data.payload)
      idempotencyKey.current = event.data.payload.idempotencyKey ?? crypto.randomUUID()
    }
    window.addEventListener('message', handleMessage)
    postToParent(initialOrigin, MESSAGE.ready, { embedded: true })
    // Announce in both bridge versions; whichever parent is listening answers with its INIT.
    const offSession = onSessionInit(initialOrigin, (payload) =>
      setSessionCreds({ sessionId: payload.session_id, clientSecret: payload.client_secret }),
    )
    postToSessionParent(initialOrigin, CHILD_MESSAGE.ready, { embedded: true })
    return () => {
      window.removeEventListener('message', handleMessage)
      offSession()
    }
  }, [initialOrigin])

  useEffect(() => {
    if (!embedded) return
    postToParent(replyOrigin, MESSAGE.status, {
      phase: checkout.phase,
      status: checkout.status,
      error: checkout.error ? { code: checkout.error.code, message: checkout.error.message } : null,
      nextAction: checkout.nextAction,
    })
    if (checkout.phase === 'paid') {
      postToParent(replyOrigin, MESSAGE.complete, checkout.status)
    }
  }, [checkout.error, checkout.nextAction, checkout.phase, checkout.status, embedded, replyOrigin])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      postToParent(replyOrigin, MESSAGE.resize, {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      })
    })
    observer.observe(document.documentElement)
    return () => observer.disconnect()
  }, [replyOrigin])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close])

  const handleBackdrop = (event: MouseEvent<HTMLElement>) => {
    if (event.target === event.currentTarget && embedded) close()
  }

  const handlePay = (input: WidgetPayInput) => {
    if (!config?.token) return
    const key = config.idempotencyKey ?? idempotencyKey.current ?? crypto.randomUUID()
    idempotencyKey.current = key
    void checkout.start({
      order_id: config.orderId,
      idempotency_key: key,
      method: input.method === 'mobile_money'
        ? { type: 'mobile_money', network: input.network, phone: input.phone }
        : { type: 'card' },
    })
  }

  if (sessionCreds) return <SessionApp initialCreds={sessionCreds} />

  return (
    <MitumbaThemeProvider disableCssBaseline>
      {config ? (
        <main className={`widget-overlay${embedded ? ' is-embedded' : ''}`} onMouseDown={handleBackdrop}>
          {!embedded ? (
            <MitumbaGlass
              blur={18}
              opacity={0.68}
              rounding="full"
              sx={{ position: 'fixed', top: 14, right: 14, zIndex: 3, px: 2, py: 0.75, fontSize: 12, color: '#31563a' }}
            >
              Preview mode
            </MitumbaGlass>
          ) : null}
          <div className="widget-stage">
            <MitumbaPayWidget
              checkout={checkout}
              amountLabel={config.amountLabel}
              lineItems={config.lineItems}
              totalLabel={config.totalLabel}
              orderId={config.orderId}
              metadata={config.metadata}
              merchantName={config.merchantName}
              logoUrl="/widget/mitumba-pay-logo.png"
              defaultPhone={config.defaultPhone}
              savedPhones={config.savedPhones}
              methods={config.methods}
              networks={config.networks}
              defaultNetwork={config.defaultNetwork}
              supportLabel={config.supportLabel}
              supportHref={config.supportHref}
              onClose={embedded ? close : undefined}
              onPay={handlePay}
            />
          </div>
        </main>
      ) : (
        <WaitingCard timedOut={initTimedOut} onClose={close} />
      )}
    </MitumbaThemeProvider>
  )
}
