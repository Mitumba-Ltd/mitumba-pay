import { z } from 'zod'
import { providerIdSchema, type ProviderId } from './provider'
import { PAY_CONTRACT_VERSION } from './version'

/** Kenyan MSISDN, E.164 with the +254 country code. */
export const KENYAN_MSISDN = /^\+254\d{9}$/

/**
 * The buyer-selected payment *method*. The client picks a method; the backend
 * picks the provider. `card` carries no fields — the backend obtains buyer
 * identity (e.g. email) itself; clients never submit provider credentials.
 */
export type CheckoutPaymentMethod = { type: 'mobile_money'; phone: string } | { type: 'card' }

export const checkoutPaymentMethodSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('mobile_money'), phone: z.string().regex(KENYAN_MSISDN) }),
  z.object({ type: z.literal('card') }),
])

export interface InitiateCheckoutInput {
  order_id: string
  /**
   * Identifies one buyer intent. Repeating the same key with semantically
   * identical input returns the original response without a second charge.
   * Reusing a key with different input yields `409 idempotency_conflict`.
   */
  idempotency_key: string
  method: CheckoutPaymentMethod
}

export const initiateCheckoutInputSchema = z.object({
  order_id: z.string().min(1),
  idempotency_key: z.string().min(1),
  method: checkoutPaymentMethodSchema,
})

/**
 * What the client must do after a successful initiation. Provider-neutral:
 * either wait for an out-of-band confirmation (mobile money STK prompt) or open
 * an absolute HTTPS redirect URL (card).
 */
export type CheckoutNextAction =
  | { type: 'await_confirmation' }
  | { type: 'redirect'; url: string; expires_at: string | null }

export const checkoutNextActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('await_confirmation') }),
  z.object({
    type: z.literal('redirect'),
    url: z.string().url(),
    expires_at: z.string().nullable(),
  }),
])

export interface InitiateCheckoutResponse {
  version: typeof PAY_CONTRACT_VERSION
  order_id: string
  attempt: {
    id: string
    sequence: number
    provider: ProviderId
    status: 'initiated'
  }
  next_action: CheckoutNextAction
}

export const initiateCheckoutResponseSchema = z.object({
  version: z.literal(PAY_CONTRACT_VERSION),
  order_id: z.string(),
  attempt: z.object({
    id: z.string(),
    sequence: z.number(),
    provider: providerIdSchema,
    status: z.literal('initiated'),
  }),
  next_action: checkoutNextActionSchema,
})
