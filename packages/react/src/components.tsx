import { type CSSProperties, type ReactNode } from 'react'
import { payTheme } from './theme'
import { type UseCheckoutResult, type CheckoutPhase } from './useCheckout'

export interface MitumbaPayButtonProps {
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  children?: ReactNode
  style?: CSSProperties
}

/** Branded primary action button. */
export function MitumbaPayButton({
  onClick,
  disabled,
  loading,
  children = 'Pay with Mitumba',
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
        padding: `${payTheme.space.md}px`,
        borderRadius: payTheme.radius.md,
        background: isDisabled ? payTheme.color.greenDark : payTheme.color.green,
        color: '#fff',
        fontFamily: payTheme.font.family,
        fontSize: 16,
        fontWeight: 600,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.7 : 1,
        ...style,
      }}
    >
      {loading ? 'Processing…' : children}
    </button>
  )
}

const PHASE_MESSAGE: Record<CheckoutPhase, string> = {
  idle: '',
  initiating: 'Starting payment…',
  awaiting_confirmation: 'Check your phone and enter your PIN to confirm.',
  redirecting: 'Redirecting to complete payment…',
  polling: 'Confirming payment…',
  paid: 'Payment confirmed. Thank you!',
  failed: 'Payment did not go through.',
  retryable: 'Payment was not completed. You can try again.',
  timeout: 'Still confirming. This can take a moment — refresh to check again.',
  error: 'Something went wrong starting the payment.',
}

export interface MitumbaPayWidgetProps {
  checkout: UseCheckoutResult
  /** Called when the user taps the pay/retry action. */
  onPay: () => void
  amountLabel?: string
  title?: string
  style?: CSSProperties
}

/**
 * Self-contained widget surface: a title, live status message, and a
 * pay/retry button driven by the {@link useCheckout} controller.
 */
export function MitumbaPayWidget({
  checkout,
  onPay,
  amountLabel,
  title = 'Complete your payment',
  style,
}: MitumbaPayWidgetProps) {
  const { phase, error } = checkout
  const busy = phase === 'initiating' || phase === 'polling' || phase === 'redirecting'
  const showRetry = phase === 'retryable' || phase === 'failed' || phase === 'error'
  const message = phase === 'error' && error ? error.message : PHASE_MESSAGE[phase]

  return (
    <section
      role="group"
      aria-label="Mitumba Pay"
      style={{
        fontFamily: payTheme.font.family,
        color: payTheme.color.ink,
        background: payTheme.color.surface,
        border: `1px solid ${payTheme.color.border}`,
        borderRadius: payTheme.radius.lg,
        padding: payTheme.space.lg,
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        gap: payTheme.space.md,
        ...style,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
        {amountLabel ? (
          <span style={{ fontWeight: 700, color: payTheme.color.earth }}>{amountLabel}</span>
        ) : null}
      </header>

      {message ? (
        <p
          role="status"
          aria-live="polite"
          style={{
            margin: 0,
            fontSize: 14,
            color: phase === 'paid' ? payTheme.color.success : payTheme.color.muted,
          }}
        >
          {message}
        </p>
      ) : null}

      {phase !== 'paid' ? (
        <MitumbaPayButton onClick={onPay} loading={busy}>
          {showRetry ? 'Try again' : 'Pay now'}
        </MitumbaPayButton>
      ) : null}
    </section>
  )
}
