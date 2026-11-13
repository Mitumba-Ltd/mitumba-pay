import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  MitumbaPayWidget,
  currencyDigits,
  formatMoney,
  unavailableMessage,
  useCheckoutSession,
  type CheckoutPhase,
  type CheckoutSessionContext,
  type PhoneFormat,
  type SessionPaymentMethod,
  type SessionPhase,
  type UseCheckoutResult,
  type UseCheckoutSessionResult,
  type WidgetMethod,
  type WidgetNetwork,
  type WidgetPayInput,
} from '@mitumba/pay-react'
import { onInit, postToParent, readParentOrigin, CHILD_MESSAGE } from './session-bridge'
import {
  allPassed,
  checkConnection,
  checkFrame,
  checkMerchant,
  checkMethods,
  checkSession,
  firstFailure,
  pendingChecks,
  readFrameFacts,
  settle,
  type FrameFacts,
  type SecureCheck,
} from './secure-checks'
import './app.css'

/**
 * Session-driven hosted widget (RFC 0001 Bridge V2), shown as a secure overlay.
 *
 * The parent launcher passes only a session id + client secret via INIT. Before any payment UI
 * renders, the overlay checks the connection, the frame, the parent's identity, and the
 * server-authored session (bound merchant origin, status, expiry, methods). The checkout renders
 * only when every check passes; otherwise the overlay refuses and says why. All display data comes
 * from the authoritative session context, never from the parent.
 */

/** How long the widget waits for the parent's INIT before telling the buyer it could not start. */
export const INIT_TIMEOUT_MS = 15_000

export interface SessionCredentials {
  sessionId: string
  clientSecret: string
}

/** Checks that depend only on the frame, settled before the widget even announces itself. */
export function frameChecks(facts: FrameFacts): SecureCheck[] {
  let checks = settle(pendingChecks(), 'connection', checkConnection(facts))
  if (!firstFailure(checks)) checks = settle(checks, 'frame', checkFrame(facts))
  return checks
}

export function SessionApp({ initialCreds = null }: { initialCreds?: SessionCredentials | null } = {}) {
  const facts = useMemo(readFrameFacts, [])
  const parentOrigin = useMemo(readParentOrigin, [])
  const [creds, setCreds] = useState<SessionCredentials | null>(initialCreds)
  const [checks, setChecks] = useState<SecureCheck[]>(() => frameChecks(facts))
  const refused = firstFailure(checks) !== null

  // Announce readiness only from a frame that passed its checks, then wait for INIT.
  useEffect(() => {
    if (creds || refused) return
    const off = onInit(parentOrigin, (payload) =>
      setCreds({ sessionId: payload.session_id, clientSecret: payload.client_secret }),
    )
    postToParent(parentOrigin, CHILD_MESSAGE.ready, { embedded: true })
    const timer = setTimeout(
      () => setChecks((current) => settle(current, 'session', "We couldn't start secure checkout. Close this and try again.")),
      INIT_TIMEOUT_MS,
    )
    return () => {
      off()
      clearTimeout(timer)
    }
  }, [creds, refused, parentOrigin])

  const close = useCallback(() => postToParent(parentOrigin, CHILD_MESSAGE.close), [parentOrigin])

  if (!creds || firstFailure(checks)) {
    return <SecureSheet checks={checks} onClose={close} />
  }

  return (
    <SessionCheckout
      parentOrigin={parentOrigin}
      sessionId={creds.sessionId}
      clientSecret={creds.clientSecret}
      frameChecks={checks}
      onClose={close}
    />
  )
}

/** The V1 waiting state uses the same secure sheet, so both bridges look and behave alike. */
export function WaitingCard({ timedOut, onClose }: { timedOut: boolean; onClose: () => void }) {
  const base = useMemo(() => frameChecks(readFrameFacts()), [])
  const checks = timedOut && !firstFailure(base)
    ? settle(base, 'session', "We couldn't start secure checkout. Close this and try again.")
    : base
  return <SecureSheet checks={checks} onClose={onClose} />
}

const BUSY_PHASES: readonly SessionPhase[] = ['initiating', 'awaiting_confirmation', 'redirecting', 'polling']

function SessionCheckout({
  parentOrigin,
  sessionId,
  clientSecret,
  frameChecks: initialChecks,
  onClose,
}: {
  parentOrigin: string | null
  sessionId: string
  clientSecret: string
  frameChecks: SecureCheck[]
  onClose: () => void
}) {
  const config = useMemo(() => ({ baseUrl: undefined }), [])
  const session = useCheckoutSession(config, sessionId, clientSecret)
  const idempotencyKey = useRef<string>(crypto.randomUUID())

  // Load the authoritative context once on mount.
  const loadContext = session.loadContext
  useEffect(() => {
    void loadContext()
  }, [loadContext])

  const { context: loaded, phase: loadPhase, error: loadError } = session
  const checks = useMemo(
    () => sessionChecks(initialChecks, { context: loaded, phase: loadPhase, error: loadError }, parentOrigin),
    [initialChecks, loaded, loadPhase, loadError, parentOrigin],
  )

  // Relay lifecycle to the parent; emit COMPLETE on paid.
  useEffect(() => {
    postToParent(parentOrigin, CHILD_MESSAGE.status, {
      phase: session.phase,
      checkout_status: session.status?.checkout_status ?? null,
    })
    if (session.phase === 'paid') postToParent(parentOrigin, CHILD_MESSAGE.complete, session.status)
  }, [session.phase, session.status, parentOrigin])

  const busy = BUSY_PHASES.includes(session.phase)
  const handleBackdrop = (event: MouseEvent<HTMLElement>) => {
    // Like a system payment sheet: a tap outside dismisses, except while a payment is in flight.
    if (event.target === event.currentTarget && !busy) onClose()
  }

  const context = session.context
  if (!context || !allPassed(checks)) {
    return <SecureSheet checks={checks} onClose={onClose} />
  }

  const view = widgetView(context)
  const pay = (input: WidgetPayInput) => {
    // A new attempt after a failed or abandoned one needs a new key; a transport error reuses it.
    if (session.phase === 'failed' || session.phase === 'retryable' || session.phase === 'timeout') {
      idempotencyKey.current = crypto.randomUUID()
    }
    const method: SessionPaymentMethod =
      input.method === 'card' ? { type: 'card' } : { type: 'mobile_money', network: input.network, phone: input.phone }
    void session.pay(method, idempotencyKey.current)
  }

  return (
    <main className="pay-overlay" onMouseDown={handleBackdrop}>
      <div className="pay-stage">
        <MitumbaPayWidget
          checkout={asWidgetCheckout(session)}
          amountLabel={view.amountLabel}
          lineItems={view.lineItems}
          totalLabel={view.amountLabel}
          orderId={context.reference || undefined}
          metadata={[{ label: 'Payment protection', value: 'Funds held securely until delivery' }]}
          merchantName="Mitumba"
          logoUrl="/widget/mitumba-pay-logo.png"
          methods={view.methods}
          networks={view.networks}
          phoneFormat={view.phoneFormat}
          supportLabel="Available 24/7"
          onClose={onClose}
          onPay={pay}
        />
      </div>
    </main>
  )
}

/** Adds the server-side checks to the frame checks as the session context arrives. */
export function sessionChecks(
  frame: SecureCheck[],
  session: Pick<UseCheckoutSessionResult, 'context' | 'phase' | 'error'>,
  parentOrigin: string | null,
): SecureCheck[] {
  const { context } = session
  if (!context) {
    if (session.phase === 'unavailable') return settle(frame, 'session', unavailableMessage(session.error?.retryAfterMs))
    if (session.phase === 'error') {
      return settle(frame, 'session', "We couldn't load this payment. Close this window and check out again.")
    }
    return frame
  }
  let checks = settle(frame, 'merchant', checkMerchant(context, parentOrigin))
  if (firstFailure(checks)) return checks
  checks = settle(checks, 'session', checkSession(context))
  if (firstFailure(checks)) return checks
  return settle(checks, 'methods', checkMethods(context))
}

/** The hosted widget's checkout surface, driven by the session controller. */
export function asWidgetCheckout(session: UseCheckoutSessionResult): UseCheckoutResult {
  const phase: CheckoutPhase =
    session.phase === 'idle' || session.phase === 'loading_context' || session.phase === 'ready' ? 'idle' : session.phase
  return {
    phase,
    status: null,
    nextAction: session.nextAction,
    error: session.error,
    start: async () => {},
    cancel: session.cancel,
    reset: session.reset,
  }
}

/** Money as the hosted card shows it: currency code first, e.g. `KES 6,000.00`. */
export function moneyLabel(money: CheckoutSessionContext['amount']): string {
  const digits = currencyDigits(money.currency)
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: money.currency,
      currencyDisplay: 'code',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
      .format(money.minor_units / 10 ** digits)
      .replace(/\u00a0/g, ' ')
  } catch {
    return formatMoney(money)
  }
}

/** Widget props from the authoritative session context only. */
export function widgetView(context: CheckoutSessionContext): {
  amountLabel: string
  lineItems: { label: string; value: string }[]
  methods: WidgetMethod[]
  networks: WidgetNetwork[]
  phoneFormat: PhoneFormat | undefined
} {
  const mobile = context.available_methods.flatMap((m) =>
    m.type === 'mobile_money' && m.network ? [{ ...m, network: m.network }] : [],
  )
  const card = context.available_methods.find((m) => m.type === 'card' && m.status === 'available')
  const methods: WidgetMethod[] = []
  if (mobile.length > 0) methods.push('mobile_money')
  if (card) methods.push('card')
  const phoneField = mobile.flatMap((m) => m.input_fields).find((f) => f.name === 'phone' && f.calling_code)
  return {
    amountLabel: moneyLabel(context.amount),
    lineItems: context.line_items.map((item) => ({ label: item.label, value: moneyLabel(item.amount) })),
    methods,
    networks: mobile.map((m) => ({ id: m.network, name: m.display_name, available: m.status === 'available' })),
    phoneFormat: phoneField?.calling_code
      ? { callingCode: phoneField.calling_code, example: phoneField.example }
      : undefined,
  }
}


/**
 * Shown until the checks pass. The checks run silently: while they run there is only a quiet spinner
 * over the dimmed page, and the checkout card appears once everything is verified. A failed check
 * replaces the spinner with a short card that says why and offers Close.
 */
export function SecureSheet({
  checks,
  onClose,
}: {
  checks: SecureCheck[]
  onClose: () => void
}) {
  const failure = firstFailure(checks)
  if (!failure) {
    return (
      <main className="pay-overlay" aria-busy="true">
        <span className="pay-gate-spinner" role="status" aria-label="Loading secure checkout" />
      </main>
    )
  }
  return (
    <main className="pay-overlay">
      <section className="pay-refusal" role="alertdialog" aria-labelledby="pay-refusal-title" aria-describedby="pay-refusal-reason">
        <span className="pay-refusal-mark" aria-hidden="true">M</span>
        <h1 id="pay-refusal-title">Mitumba Pay</h1>
        <p id="pay-refusal-reason" role="alert">{failure.reason}</p>
        <button type="button" className="pay-refusal-close" onClick={onClose}>Close</button>
      </section>
    </main>
  )
}
