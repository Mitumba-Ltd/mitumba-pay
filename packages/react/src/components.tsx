import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react'
import { payTheme as t } from './theme'
import { type UseCheckoutResult, type CheckoutPhase } from './useCheckout'

export interface MitumbaPayButtonProps {
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  children?: ReactNode
  style?: CSSProperties
}

export function MitumbaPayButton({ onClick, disabled, loading, children = 'Pay', style }: MitumbaPayButtonProps) {
  return (
    <button
      type="button"
      className="mpay-primary"
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      style={style}
    >
      {loading ? <><span className="mpay-spinner" aria-hidden /> Processing…</> : children}
    </button>
  )
}

export type WidgetMethod = 'mobile_money' | 'card'

export interface WidgetLineItem { label: string; value: string }
export interface WidgetMetadataItem { label: string; value: string }
export interface WidgetSavedPhone { label: string; value: string }

export interface MitumbaPayWidgetProps {
  checkout: UseCheckoutResult
  amountLabel: string
  lineItems?: WidgetLineItem[]
  totalLabel?: string
  orderId?: string
  metadata?: WidgetMetadataItem[]
  merchantName?: string
  onPay: (input: { method: WidgetMethod; phone?: string }) => void
  methods?: WidgetMethod[]
  defaultPhone?: string
  savedPhones?: WidgetSavedPhone[]
  supportLabel?: string
  supportHref?: string
  onClose?: () => void
  className?: string
  style?: CSSProperties
}

const PHASE_MESSAGE: Record<CheckoutPhase, string> = {
  idle: '',
  initiating: 'Starting your secure payment…',
  awaiting_confirmation: 'Check your phone and enter your PIN to approve the payment.',
  redirecting: 'Opening secure card checkout…',
  polling: 'We’re confirming your payment…',
  paid: 'Payment received. Your order is confirmed.',
  failed: 'That payment didn’t go through.',
  retryable: 'Payment wasn’t completed. You can safely try again.',
  timeout: 'Still confirming. Keep this window open or check your order shortly.',
  error: 'We couldn’t start the payment.',
}

const METHOD_LABEL: Record<WidgetMethod, string> = { mobile_money: 'Mobile payment', card: 'Card' }

export function MitumbaPayWidget({
  checkout,
  amountLabel,
  lineItems = [],
  totalLabel,
  orderId,
  metadata = [],
  merchantName = 'Mitumba',
  onPay,
  methods = ['mobile_money', 'card'],
  defaultPhone = '',
  savedPhones = [],
  supportLabel = 'We’re here if you need help',
  supportHref,
  onClose,
  className,
  style,
}: MitumbaPayWidgetProps) {
  const inputId = useId()
  const [method, setMethod] = useState<WidgetMethod>(methods[0] ?? 'mobile_money')
  const [phone, setPhone] = useState(defaultPhone)
  const { phase, error } = checkout

  useEffect(() => setPhone(defaultPhone), [defaultPhone])
  useEffect(() => {
    if (!methods.includes(method)) setMethod(methods[0] ?? 'mobile_money')
  }, [method, methods])

  const busy = phase === 'initiating' || phase === 'polling' || phase === 'redirecting' || phase === 'awaiting_confirmation'
  const done = phase === 'paid'
  const failed = phase === 'failed' || phase === 'retryable' || phase === 'error'
  const phoneValid = /^\+254\d{9}$/.test(phone)
  const canPay = !busy && !done && (method === 'card' || phoneValid)
  const message = phase === 'error' && error ? error.message : PHASE_MESSAGE[phase]
  const shownTotal = totalLabel ?? amountLabel

  return (
    <section
      className={`mpay-checkout${className ? ` ${className}` : ''}`}
      aria-label={`${merchantName} secure checkout`}
      style={{
        '--mpay-green': t.color.green,
        '--mpay-green-dark': t.color.greenDark,
        '--mpay-earth': t.color.earth,
        '--mpay-ink': t.color.ink,
        '--mpay-muted': t.color.muted,
        '--mpay-border': t.color.border,
        '--mpay-surface': t.color.surface,
        ...style,
      } as CSSProperties}
    >
      <style>{WIDGET_CSS}</style>

      <aside className="mpay-summary">
        <div className="mpay-weave" aria-hidden />
        <div className="mpay-summary-content">
          <div className="mpay-brand-row">
            <span className="mpay-brand-mark">M</span>
            <span>{merchantName} Pay</span>
          </div>

          <div className="mpay-amount-block">
            <span className="mpay-eyebrow">Amount due</span>
            <strong className="mpay-amount">{amountLabel}</strong>
          </div>

          <div className="mpay-lines" aria-label="Order summary">
            {lineItems.map((item) => <SummaryRow key={item.label} {...item} />)}
            <div className="mpay-summary-rule" />
            <SummaryRow label="Total" value={shownTotal} strong />
          </div>

          <div className="mpay-meta">
            {orderId ? <MetaRow icon={<ReceiptIcon />} label="Order reference" value={orderId} /> : null}
            {metadata.map((item) => <MetaRow key={`${item.label}-${item.value}`} icon={<CalendarIcon />} {...item} />)}
          </div>

          <div className="mpay-support">
            <div>
              <strong>Customer support</strong>
              <span>{supportLabel}</span>
            </div>
            {supportHref ? (
              <a href={supportHref} className="mpay-support-button" aria-label="Contact customer support"><ChatIcon /></a>
            ) : <span className="mpay-support-button" aria-hidden><ChatIcon /></span>}
          </div>
        </div>
      </aside>

      <div className="mpay-action">
        <header className="mpay-action-header">
          <div>
            <span className="mpay-mobile-brand">{merchantName} Pay</span>
            <h2>Payment methods</h2>
          </div>
          {onClose ? <button className="mpay-close" type="button" onClick={onClose} aria-label="Close payment"><CloseIcon /></button> : <LockIcon />}
        </header>

        <div className="mpay-tabs" role="tablist" aria-label="Choose payment method">
          {methods.map((item) => (
            <button
              key={item}
              className={`mpay-tab${item === method ? ' is-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={item === method}
              disabled={busy || done}
              onClick={() => setMethod(item)}
            >
              {METHOD_LABEL[item]}
            </button>
          ))}
          <span className="mpay-tab mpay-more" aria-disabled>+ More</span>
        </div>

        <div className="mpay-method-body">
          {done ? (
            <Outcome icon="✓" title="Payment complete" message={message} tone="success" />
          ) : busy ? (
            <Outcome icon={<span className="mpay-pulse"><PhoneIcon /></span>} title={phase === 'redirecting' ? 'Opening checkout' : 'Check your phone'} message={message} tone="pending" />
          ) : (
            <>
              {method === 'mobile_money' ? (
                <div className="mpay-field-group">
                  {savedPhones.length > 0 ? (
                    <div className="mpay-saved" aria-label="Saved mobile numbers">
                      <span className="mpay-field-caption">Saved numbers</span>
                      <div className="mpay-chips">
                        {savedPhones.map((saved) => (
                          <button key={saved.value} type="button" className={`mpay-chip${saved.value === phone ? ' is-selected' : ''}`} onClick={() => setPhone(saved.value)}>
                            {saved.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <label className="mpay-field" htmlFor={inputId}>
                    <span>Mobile number</span>
                    <div className={`mpay-input-wrap${phone && !phoneValid ? ' has-error' : ''}`}>
                      <PhoneIcon />
                      <input id={inputId} inputMode="tel" autoComplete="tel" placeholder="+254 7XX XXX XXX" value={phone} onChange={(event) => setPhone(normalizePhone(event.target.value))} />
                      {phoneValid ? <span className="mpay-valid" aria-label="Valid number">✓</span> : null}
                    </div>
                    <small>{phone && !phoneValid ? 'Use the format +2547XXXXXXXX' : 'A secure payment prompt will appear on your phone.'}</small>
                  </label>
                </div>
              ) : (
                <div className="mpay-card-redirect">
                  <span className="mpay-card-icon"><CardIcon /></span>
                  <div><strong>Secure card checkout</strong><p>Your card details are entered on our PCI-compliant payment page. Mitumba never stores your card number.</p></div>
                </div>
              )}

              {failed && message ? <div className="mpay-inline-message is-error" role="alert">{message}</div> : null}
            </>
          )}
        </div>

        {!done && !busy ? (
          <MitumbaPayButton onClick={() => onPay(method === 'mobile_money' ? { method, phone } : { method })} disabled={!canPay}>
            {failed ? 'Try again' : `Pay ${amountLabel}`}
          </MitumbaPayButton>
        ) : null}

        <footer className="mpay-secure"><LockIcon /><span>Encrypted and securely processed</span><i>·</i><span>Powered by Mitumba</span></footer>
      </div>
    </section>
  )
}

function normalizePhone(value: string): string {
  const trimmed = value.replace(/[\s()-]/g, '')
  if (trimmed.startsWith('07') && trimmed.length <= 10) return `+254${trimmed.slice(1)}`
  if (trimmed.startsWith('254')) return `+${trimmed}`
  return trimmed
}

function SummaryRow({ label, value, strong }: WidgetLineItem & { strong?: boolean }) {
  return <div className={`mpay-line${strong ? ' is-strong' : ''}`}><span>{label}</span><i aria-hidden /><b>{value}</b></div>
}

function MetaRow({ icon, label, value }: WidgetMetadataItem & { icon: ReactNode }) {
  return <div className="mpay-meta-row"><span className="mpay-meta-icon">{icon}</span><div><span>{label}</span><strong>{value}</strong></div></div>
}

function Outcome({ icon, title, message, tone }: { icon: ReactNode; title: string; message: string; tone: 'success' | 'pending' }) {
  return <div className={`mpay-outcome is-${tone}`} role="status" aria-live="polite"><span className="mpay-outcome-icon">{icon}</span><h3>{title}</h3><p>{message}</p></div>
}

const icon = (children: ReactNode) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
const ReceiptIcon = () => icon(<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></>)
const CalendarIcon = () => icon(<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>)
const ChatIcon = () => icon(<><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></>)
const PhoneIcon = () => icon(<><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/></>)
const CardIcon = () => icon(<><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></>)
const LockIcon = () => icon(<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>)
const CloseIcon = () => icon(<><path d="m6 6 12 12M18 6 6 18"/></>)

const WIDGET_CSS = `
.mpay-checkout{display:grid;grid-template-columns:minmax(260px,38%) minmax(360px,1fr);width:min(900px,100%);min-height:570px;border-radius:24px;overflow:hidden;background:var(--mpay-surface);box-shadow:0 32px 90px rgba(18,39,25,.24);isolation:isolate;color:var(--mpay-ink)}
.mpay-checkout *{box-sizing:border-box}.mpay-checkout button,.mpay-checkout input{font:inherit}.mpay-summary{position:relative;overflow:hidden;background:linear-gradient(145deg,var(--mpay-green) 0%,#35a65c 100%);color:#fff}.mpay-weave{position:absolute;inset:0;opacity:.12;background-image:linear-gradient(30deg,transparent 12%,rgba(255,255,255,.4) 12.5%,transparent 13%),linear-gradient(150deg,transparent 12%,rgba(255,255,255,.28) 12.5%,transparent 13%);background-size:72px 120px;transform:scale(1.2)}
.mpay-summary-content{position:relative;z-index:1;display:flex;flex-direction:column;min-height:100%;padding:40px 36px}.mpay-brand-row{display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px;letter-spacing:.01em}.mpay-brand-mark{display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.22);font-size:14px}.mpay-amount-block{display:flex;flex-direction:column;gap:6px;margin-top:62px}.mpay-eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.68)}.mpay-amount{font-size:34px;line-height:1.15;font-weight:560;letter-spacing:-.04em}.mpay-lines{display:flex;flex-direction:column;gap:11px;margin-top:32px}.mpay-line{display:flex;align-items:center;gap:10px;font-size:13px;color:rgba(255,255,255,.78)}.mpay-line i{flex:1;border-bottom:1px dotted rgba(255,255,255,.38);transform:translateY(-2px)}.mpay-line b{font-weight:560;color:#fff}.mpay-line.is-strong{font-size:14px;color:#fff}.mpay-line.is-strong span,.mpay-line.is-strong b{font-weight:750}.mpay-summary-rule{height:1px;background:rgba(255,255,255,.22);margin:8px 0}.mpay-meta{display:grid;gap:22px;margin-top:36px}.mpay-meta-row{display:flex;align-items:flex-start;gap:12px}.mpay-meta-icon{display:flex;color:rgba(255,255,255,.84)}.mpay-meta-row div{display:flex;flex-direction:column;gap:3px;min-width:0}.mpay-meta-row div span{font-size:11px;color:rgba(255,255,255,.62);text-transform:uppercase;letter-spacing:.08em}.mpay-meta-row strong{font-size:14px;font-weight:600;overflow-wrap:anywhere}.mpay-support{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:auto;padding-top:32px}.mpay-support>div{display:flex;flex-direction:column;gap:3px}.mpay-support strong{font-size:12px}.mpay-support span{font-size:12px;color:rgba(255,255,255,.7)}.mpay-support-button{display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;text-decoration:none;transition:background .18s ease}.mpay-support-button:hover{background:rgba(255,255,255,.22)}
.mpay-action{display:flex;flex-direction:column;padding:42px 44px 32px;background:rgba(255,255,255,.98)}.mpay-action-header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.mpay-action-header h2{margin:0;font-size:27px;line-height:1.2;font-weight:540;letter-spacing:-.035em}.mpay-action-header>svg{color:var(--mpay-green);width:18px}.mpay-mobile-brand{display:none;color:var(--mpay-green);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.12em}.mpay-close{display:grid;place-items:center;width:38px;height:38px;border:0;border-radius:50%;background:#f6f7f5;color:#607066;cursor:pointer}.mpay-close:hover{background:#edf2ed;color:var(--mpay-green)}.mpay-tabs{display:flex;align-items:center;gap:28px;margin-top:34px;border-bottom:1px solid #ecefec}.mpay-tab{appearance:none;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;padding:0 0 14px;background:transparent;color:#68716b;font-size:13px;white-space:nowrap;cursor:pointer}.mpay-tab.is-active{color:var(--mpay-green);border-color:var(--mpay-green);font-weight:700}.mpay-tab:disabled{cursor:default;opacity:.65}.mpay-tab.mpay-more{margin-left:auto;cursor:default;color:#9ba19d}.mpay-method-body{display:flex;flex:1;flex-direction:column;justify-content:center;min-height:275px}.mpay-field-group{display:grid;gap:24px}.mpay-field-caption{display:block;margin-bottom:10px;color:#8b938e;font-size:11px;text-transform:uppercase;letter-spacing:.08em}.mpay-chips{display:flex;gap:10px;flex-wrap:wrap}.mpay-chip{appearance:none;padding:9px 14px;border:1px solid transparent;border-radius:999px;background:#f5f6f4;color:#59615c;font-size:12px;cursor:pointer}.mpay-chip.is-selected{background:var(--mpay-green);color:#fff}.mpay-field>span{display:block;margin-bottom:7px;color:#89908b;font-size:12px}.mpay-input-wrap{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;border-bottom:1px solid #dfe4e0;padding:7px 2px 10px;color:#7e8981}.mpay-input-wrap:focus-within{border-color:var(--mpay-green);color:var(--mpay-green)}.mpay-input-wrap.has-error{border-color:#c24b3e}.mpay-input-wrap input{min-width:0;border:0;outline:0;background:transparent;color:var(--mpay-ink);font-size:17px;letter-spacing:.04em}.mpay-input-wrap input::placeholder{color:#b0b6b2}.mpay-valid{display:grid;place-items:center;width:21px;height:21px;border-radius:50%;background:#e9f6ed;color:var(--mpay-green);font-weight:800}.mpay-field small{display:block;margin-top:9px;color:#9ba19d;font-size:11px}.mpay-card-redirect{display:flex;align-items:flex-start;gap:16px;padding:22px;border-radius:16px;background:#f7f9f7;border:1px solid #edf0ed}.mpay-card-icon{display:grid;place-items:center;flex:none;width:42px;height:42px;border-radius:13px;background:#e9f5ec;color:var(--mpay-green)}.mpay-card-redirect strong{font-size:14px}.mpay-card-redirect p{margin:6px 0 0;color:#707973;font-size:12px;line-height:1.6}.mpay-primary{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;min-height:54px;border:0;border-radius:4px;background:var(--mpay-green);color:#fff;font-weight:750;font-size:14px;cursor:pointer;box-shadow:0 10px 24px rgba(61,154,82,.2);transition:transform .15s ease,background .15s ease,box-shadow .15s ease}.mpay-primary:hover:not(:disabled){background:var(--mpay-green-dark);transform:translateY(-1px);box-shadow:0 13px 28px rgba(61,154,82,.26)}.mpay-primary:disabled{cursor:not-allowed;opacity:.56;box-shadow:none}.mpay-spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.38);border-top-color:#fff;border-radius:50%;animation:mpay-spin .8s linear infinite}.mpay-outcome{display:flex;flex-direction:column;align-items:center;text-align:center;padding:24px}.mpay-outcome-icon{display:grid;place-items:center;width:72px;height:72px;border-radius:50%;font-size:30px;font-weight:800}.mpay-outcome.is-success .mpay-outcome-icon{background:#e9f6ed;color:var(--mpay-green)}.mpay-outcome.is-pending .mpay-outcome-icon{background:#edf6ef;color:var(--mpay-green)}.mpay-outcome h3{margin:18px 0 7px;font-size:19px}.mpay-outcome p{max-width:300px;margin:0;color:var(--mpay-muted);font-size:13px;line-height:1.6}.mpay-pulse{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;animation:mpay-pulse 1.8s ease-in-out infinite}.mpay-inline-message{margin-top:20px;padding:11px 13px;border-radius:9px;font-size:12px}.mpay-inline-message.is-error{background:#fff0ee;color:#a13a30}.mpay-secure{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:16px;color:#9aa29d;font-size:10px}.mpay-secure svg{width:13px;height:13px}.mpay-secure i{font-style:normal}
@keyframes mpay-spin{to{transform:rotate(360deg)}}@keyframes mpay-pulse{0%,100%{box-shadow:0 0 0 0 rgba(61,154,82,.14)}50%{box-shadow:0 0 0 16px rgba(61,154,82,0)}}
@media(max-width:680px){.mpay-checkout{display:flex;flex-direction:column;width:100%;min-height:100dvh;border-radius:0;box-shadow:none;background:transparent}.mpay-summary{flex:none;min-height:240px;border-radius:0}.mpay-summary-content{min-height:240px;padding:25px 22px 56px}.mpay-brand-row{font-size:13px}.mpay-brand-mark{width:27px;height:27px}.mpay-amount-block{align-items:center;margin-top:26px;text-align:center}.mpay-eyebrow{font-size:10px}.mpay-amount{font-size:34px}.mpay-lines{margin-top:22px}.mpay-meta,.mpay-support{display:none}.mpay-action{position:relative;flex:1;margin-top:-30px;padding:27px 22px 22px;border-radius:28px 28px 0 0;background:#fff;box-shadow:0 -12px 40px rgba(22,62,35,.09)}.mpay-action-header h2{font-size:22px}.mpay-mobile-brand{display:block;margin-bottom:5px}.mpay-tabs{margin-top:25px;gap:22px;overflow-x:auto}.mpay-method-body{min-height:245px}.mpay-secure{flex-wrap:wrap}.mpay-more{display:none}}
@media(min-width:681px) and (max-height:650px){.mpay-checkout{min-height:500px}.mpay-summary-content{padding-top:28px;padding-bottom:28px}.mpay-amount-block{margin-top:34px}.mpay-action{padding-top:30px;padding-bottom:24px}.mpay-method-body{min-height:220px}}
@media(prefers-reduced-motion:reduce){.mpay-checkout *{animation:none!important;transition:none!important}}
`
