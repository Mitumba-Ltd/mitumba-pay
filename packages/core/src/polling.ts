import type { CheckoutStatusResponse, CheckoutSessionStatusResponse } from '@mitumba/pay-contract'
import type { RequestOptions } from './config'

/** The minimal shape the polling loop needs from any status response. */
export interface PollableStatus {
  terminal: boolean
  retryable: boolean
  poll_after_ms: number
}

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

/** Generic poll options over any pollable status `S`. */
export interface PollStatusOptions<S extends PollableStatus> {
  onUpdate?: (status: S) => void
  deadlineMs?: number
  onTimeout?: (last: S | null) => void
  signal?: AbortSignal
  jitter?: number
}

export type FetchStatus = (
  orderId: string,
  options?: RequestOptions,
) => Promise<CheckoutStatusResponse>

/**
 * Generic polling loop shared by order-based and session-based status reads.
 * Honors server-authored `poll_after_ms` with jitter, keeps at most one request
 * in flight, stops on `terminal` or `retryable`, respects a client deadline, and
 * never converts an unknown state into failure. The caller supplies how to fetch
 * one status reading.
 */
export async function pollStatus<S extends PollableStatus>(
  fetchOnce: (signal?: AbortSignal) => Promise<S>,
  options: PollStatusOptions<S> = {},
): Promise<S | null> {
  const deadlineMs = options.deadlineMs ?? 120_000
  const jitter = options.jitter ?? 0.2
  const startedAt = Date.now()
  let last: S | null = null

  for (;;) {
    if (options.signal?.aborted) return last

    last = await fetchOnce(options.signal)
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

/**
 * Polls the legacy order-based checkout status per the contract's guidance.
 * Thin wrapper over {@link pollStatus}. Resolves with the last status when
 * polling stops naturally (terminal or retryable) or on deadline/abort.
 */
export async function pollCheckoutStatus(
  fetchStatus: FetchStatus,
  orderId: string,
  options: PollOptions = {},
): Promise<CheckoutStatusResponse | null> {
  return pollStatus<CheckoutStatusResponse>(
    (signal) => fetchStatus(orderId, { signal }),
    options,
  )
}

/** Session-based polling options. */
export type PollSessionOptions = PollStatusOptions<CheckoutSessionStatusResponse>

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
