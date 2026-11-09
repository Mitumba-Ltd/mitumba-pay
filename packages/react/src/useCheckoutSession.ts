import { useCallback, useMemo, useRef, useState } from 'react'
import {
  MitumbaPay,
  PayError,
  type MitumbaPayConfig,
  type CheckoutSessionContext,
  type CheckoutSessionStatusResponse,
  type CheckoutNextAction,
  type SessionPaymentMethod,
} from '@mitumba/pay'

/**
 * Session-driven checkout phases (RFC 0001), the web analog of the native hook.
 * Load the authoritative session context, submit an attempt, then poll session
 * status — all through the typed core session client.
 */
export type SessionPhase =
  | 'idle'
  | 'loading_context'
  | 'ready'
  | 'initiating'
  | 'awaiting_confirmation'
  | 'redirecting'
  | 'polling'
  | 'paid'
  | 'failed'
  | 'retryable'
  | 'timeout'
  /** Payments are temporarily unavailable (HTTP 503: paused, or the provider is down). Nothing was charged; retry later. */
  | 'unavailable'
  | 'error'

export interface UseCheckoutSessionState {
  phase: SessionPhase
  context: CheckoutSessionContext | null
  status: CheckoutSessionStatusResponse | null
  nextAction: CheckoutNextAction | null
  error: PayError | null
}

export interface UseCheckoutSessionResult extends UseCheckoutSessionState {
  loadContext: () => Promise<void>
  pay: (method: SessionPaymentMethod, idempotencyKey: string) => Promise<void>
  cancel: () => void
  reset: () => void
}

/**
 * Headless session checkout controller for the web widget. Owns no markup — it
 * drives the @mitumba/pay session client (getCheckoutSessionContext →
 * createAttempt → pollCheckoutSessionStatus) and exposes phase/context/status.
 * A client-deadline timeout means "still confirming," never payment failure.
 */
export function useCheckoutSession(
  config: MitumbaPayConfig | MitumbaPay,
  sessionId: string,
  clientSecret: string,
): UseCheckoutSessionResult {
  const client = useMemo(
    () => (config instanceof MitumbaPay ? config : new MitumbaPay(config)),
    [config],
  )
  const [state, setState] = useState<UseCheckoutSessionState>({
    phase: 'idle',
    context: null,
    status: null,
    nextAction: null,
    error: null,
  })
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const reset = useCallback(() => {
    cancel()
    setState({ phase: 'idle', context: null, status: null, nextAction: null, error: null })
  }, [cancel])

  const toError = useCallback((err: unknown): PayError => {
    if (err instanceof PayError) return err
    return new PayError(0, {
      error: 'client_error',
      message: err instanceof Error ? err.message : 'Unknown error',
    })
  }, [])

  /** A 503 is 'unavailable' (retry later); anything else is an 'error'. */
  const failureOf = (error: PayError): Pick<UseCheckoutSessionState, 'phase' | 'error'> => ({
    phase: error.isUnavailable ? 'unavailable' : 'error',
    error,
  })

  const loadContext = useCallback(async () => {
    cancel()
    const controller = new AbortController()
    abortRef.current = controller
    setState((s) => ({ ...s, phase: 'loading_context', error: null }))
    try {
      const context = await client.getCheckoutSessionContext(sessionId, clientSecret, {
        signal: controller.signal,
      })
      setState((s) => ({ ...s, phase: 'ready', context }))
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setState((s) => ({ ...s, ...failureOf(toError(err)) }))
    }
  }, [client, sessionId, clientSecret, cancel, toError])

  const pay = useCallback(
    async (method: SessionPaymentMethod, idempotencyKey: string) => {
      cancel()
      const controller = new AbortController()
      abortRef.current = controller
      setState((s) => ({ ...s, phase: 'initiating', nextAction: null, error: null }))

      try {
        const attempt = await client.createAttempt(
          sessionId,
          clientSecret,
          { idempotency_key: idempotencyKey, method },
          { signal: controller.signal },
        )
        const nextAction = attempt.next_action
        setState((s) => ({
          ...s,
          nextAction,
          phase: nextAction?.type === 'redirect' ? 'redirecting' : 'awaiting_confirmation',
        }))

        const last = await client.pollCheckoutSessionStatus(sessionId, clientSecret, {
          signal: controller.signal,
          onUpdate: (status) => setState((s) => ({ ...s, phase: 'polling', status })),
        })

        if (!last) return
        setState((s) => ({
          ...s,
          status: last,
          phase: last.terminal
            ? last.checkout_status === 'paid'
              ? 'paid'
              : 'failed'
            : last.retryable
              ? 'retryable'
              : 'timeout',
        }))
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setState((s) => ({ ...s, ...failureOf(toError(err)) }))
      }
    },
    [client, sessionId, clientSecret, cancel, toError],
  )

  return { ...state, loadContext, pay, cancel, reset }
}
