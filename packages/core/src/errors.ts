import type { PayErrorBody } from '@mitumba/pay-contract'

/**
 * What a buyer is told for a documented error code when the response carries no message of its own.
 * Plain words, never the code itself.
 */
export const PAY_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  invalid_input: 'Check the details and try again.',
  unauthorized: 'Your payment session has ended. Close this and check out again.',
  not_found: 'This payment could not be found. Close this and check out again.',
  order_not_payable: 'This order cannot take a payment right now. If you just tried, wait a moment and try again.',
  idempotency_conflict: 'This payment changed. Close this and try again.',
  payment_method_unavailable: 'That payment method is not available for this order. Choose another.',
  payment_initiation_paused: 'Payments are paused for a moment. Nothing was charged; try again shortly.',
  payment_provider_unavailable: 'The payment service is not responding. Nothing was charged; try again shortly.',
  session_expired: 'This payment has expired. Close this and check out again.',
  session_closed: 'This payment is already closed. Close this and check out again.',
}

export interface PayErrorOptions {
  /** From the response's `Retry-After` header, in milliseconds, when the server sent one. */
  retryAfterMs?: number | null
}

/**
 * Thrown for any non-2xx API response and for network/transport failures.
 * `code` is the machine-readable error code from the API envelope (`{ error }`).
 * `status` is 0 for network-level failures.
 */
export class PayError extends Error {
  public readonly code: string
  public readonly status: number
  public readonly details?: unknown
  /**
   * How long the server asked the client to wait before trying again, in milliseconds, or null
   * when it gave no `Retry-After`. Set on 503 (payments paused, provider unavailable) and 429.
   */
  public readonly retryAfterMs: number | null

  constructor(status: number, body: PayErrorBody, options: PayErrorOptions = {}) {
    super(body.message ?? PAY_ERROR_MESSAGES[body.error] ?? body.error)
    this.name = 'PayError'
    this.code = body.error
    this.status = status
    this.details = body.details
    this.retryAfterMs = options.retryAfterMs ?? null
  }

  /**
   * True when payments are temporarily unavailable (HTTP 503): initiation paused by the platform
   * (`payment_initiation_paused`) or the provider for this method unreachable
   * (`payment_provider_unavailable`). Nothing was charged; offer a later retry, never a failure.
   */
  get isUnavailable(): boolean {
    return this.status === 503
  }

  /** @deprecated Use {@link isUnavailable}. Same meaning. */
  get isTemporary(): boolean {
    return this.isUnavailable
  }
}

/**
 * Parse a `Retry-After` header: either delta-seconds (`"120"`) or an HTTP-date. Returns
 * milliseconds from `now`, never negative, or null when the header is absent or unparseable.
 */
export function parseRetryAfter(value: string | null | undefined, now: number = Date.now()): number | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed)
    return Number.isSafeInteger(seconds) ? seconds * 1000 : null
  }
  const at = Date.parse(trimmed)
  if (Number.isNaN(at)) return null
  return Math.max(0, at - now)
}
