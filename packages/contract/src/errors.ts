import { z } from 'zod'

/**
 * Error codes emitted by the checkout-initiate endpoint, per the contract.
 * Responses are shaped as `{ error: <code> }`.
 */
export type CheckoutInitiateErrorCode =
  | 'invalid_input'
  | 'unauthorized'
  | 'not_found'
  | 'order_not_payable'
  | 'idempotency_conflict'
  | 'payment_method_unavailable'
  | 'payment_initiation_paused'
  | 'payment_provider_unavailable'

/** Error codes emitted by the checkout-status endpoint. */
export type CheckoutStatusErrorCode = 'unauthorized' | 'not_found'

/** Any documented payment error code. */
export type PayErrorCode = CheckoutInitiateErrorCode | CheckoutStatusErrorCode

/** The standard error envelope returned by the API on non-2xx responses. */
export interface PayErrorBody {
  error: string
  message?: string
  details?: unknown
}

export const payErrorBodySchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.unknown().optional(),
})

export const CHECKOUT_INITIATE_ERROR_STATUS: Record<CheckoutInitiateErrorCode, number> = {
  invalid_input: 400,
  unauthorized: 401,
  not_found: 404,
  order_not_payable: 409,
  idempotency_conflict: 409,
  payment_method_unavailable: 422,
  payment_initiation_paused: 503,
  payment_provider_unavailable: 503,
}
