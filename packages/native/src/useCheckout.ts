import { useCallback, useMemo, useRef, useState } from 'react'
import {
  MitumbaPay,
  PayError,
  type MitumbaPayConfig,
  type InitiateCheckoutInput,
  type CheckoutNextAction,
  type CheckoutStatusResponse,
} from '@mitumba/pay'

export type CheckoutPhase =
  | 'idle'
  | 'initiating'
  | 'awaiting_confirmation'
  | 'redirecting'
  | 'polling'
  | 'paid'
  | 'failed'
  | 'retryable'
  | 'timeout'
  | 'error'

export interface UseCheckoutState {
  phase: CheckoutPhase
  status: CheckoutStatusResponse | null
  nextAction: CheckoutNextAction | null
  error: PayError | null
}

export interface UseCheckoutResult extends UseCheckoutState {
  start: (input: InitiateCheckoutInput) => Promise<void>
  cancel: () => void
  reset: () => void
}

/**
 * Headless checkout controller for React Native. Identical behavior to the web
 * hook — it drives the @mitumba/pay state machine and exposes phase/status/error.
 * No WebView, no DOM: payment initiation goes through the typed core client.
 */
export function useCheckout(config: MitumbaPayConfig | MitumbaPay): UseCheckoutResult {
  const client = useMemo(
    () => (config instanceof MitumbaPay ? config : new MitumbaPay(config)),
    [config],
  )
  const [state, setState] = useState<UseCheckoutState>({
    phase: 'idle',
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
    setState({ phase: 'idle', status: null, nextAction: null, error: null })
  }, [cancel])

  const start = useCallback(
    async (input: InitiateCheckoutInput) => {
      cancel()
      const controller = new AbortController()
      abortRef.current = controller
      setState({ phase: 'initiating', status: null, nextAction: null, error: null })

      try {
        const res = await client.initiateCheckout(input, { signal: controller.signal })
        const phase: CheckoutPhase =
          res.next_action.type === 'redirect' ? 'redirecting' : 'awaiting_confirmation'
        setState((s) => ({ ...s, phase, nextAction: res.next_action }))

        const last = await client.pollCheckoutStatus(input.order_id, {
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
        const payError = err instanceof PayError ? err : null
        setState((s) => ({
          ...s,
          phase: 'error',
          error:
            payError ??
            new PayError(0, {
              error: 'client_error',
              message: err instanceof Error ? err.message : 'Unknown error',
            }),
        }))
      }
    },
    [client, cancel],
  )

  return { ...state, start, cancel, reset }
}
