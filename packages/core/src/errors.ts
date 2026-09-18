import type { PayErrorBody } from '@mitumba/pay-contract'

/**
 * Thrown for any non-2xx API response and for network/transport failures.
 * `code` is the machine-readable error code from the API envelope (`{ error }`).
 * `status` is 0 for network-level failures.
 */
export class PayError extends Error {
  public readonly code: string
  public readonly status: number
  public readonly details?: unknown

  constructor(status: number, body: PayErrorBody) {
    super(body.message ?? body.error)
    this.name = 'PayError'
    this.code = body.error
    this.status = status
    this.details = body.details
  }

  /** True for `payment_initiation_paused` / `payment_provider_unavailable` (503). */
  get isTemporary(): boolean {
    return this.status === 503
  }
}
