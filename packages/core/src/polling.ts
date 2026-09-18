import type { CheckoutStatusResponse } from '@mitumba/pay-contract'
import type { RequestOptions } from './config'

export interface PollOptions {
  /**
   * Fired on every successful status read. Return value is ignored.
   */
  onUpdate?: (status: CheckoutStatusResponse) => void
  /**
   * Client-side safety deadline (ms). When exceeded, polling stops and
   * `onTimeout` fires. This displays "still confirming" — it must NOT be
   * treated as payment failure. Default 120000 (2 min).
   */
  deadlineMs?: number
  onTimeout?: (last: CheckoutStatusResponse | null) => void
  /** Abort signal to stop polling. */
  signal?: AbortSignal
  /** Fractional jitter applied to each server-authored interval. Default 0.2. */
  jitter?: number
}

export type FetchStatus = (
  orderId: string,
  options?: RequestOptions,
) => Promise<CheckoutStatusResponse>

/**
 * Polls checkout status per the contract's guidance:
 * - honors server-authored `poll_after_ms`, adds jitter,
 * - keeps at most one request in flight,
 * - stops when `terminal` is true,
 * - stops (and reports retryable) when `retryable` is true,
 * - never converts an unknown server state into failure.
 *
 * Resolves with the last status when polling stops naturally (terminal or
 * retryable) or on deadline/abort. Framework-agnostic: view layers subscribe
 * via `onUpdate`.
 */
export async function pollCheckoutStatus(
  fetchStatus: FetchStatus,
  orderId: string,
  options: PollOptions = {},
): Promise<CheckoutStatusResponse | null> {
  const deadlineMs = options.deadlineMs ?? 120_000
  const jitter = options.jitter ?? 0.2
  const startedAt = Date.now()
  let last: CheckoutStatusResponse | null = null

  for (;;) {
    if (options.signal?.aborted) return last

    last = await fetchStatus(orderId, { signal: options.signal })
    options.onUpdate?.(last)

    if (last.terminal) return last
    if (last.retryable) return last

    if (Date.now() - startedAt >= deadlineMs) {
      options.onTimeout?.(last)
      return last
    }

    const wait = applyJitter(last.poll_after_ms, jitter)
    const remaining = deadlineMs - (Date.now() - startedAt)
    await sleep(Math.min(wait, Math.max(remaining, 0)), options.signal)
  }
}

function applyJitter(baseMs: number, jitter: number): number {
  if (jitter <= 0) return baseMs
  const delta = baseMs * jitter
  return Math.round(baseMs - delta + Math.random() * 2 * delta)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0) return resolve()
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      resolve()
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
