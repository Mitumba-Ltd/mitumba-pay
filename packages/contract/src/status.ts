import { z } from 'zod'
import { providerIdSchema, type ProviderId } from './provider'
import { checkoutOrderSchema, type CheckoutOrder } from './order'
import { PAY_CONTRACT_VERSION } from './version'

/** Per-attempt payment state. Only `initiated` is non-terminal. */
export type PaymentAttemptStatus = 'initiated' | 'funded' | 'failed' | 'refunded' | 'cancelled'

/** Aggregate, buyer-visible checkout state. */
export type CheckoutStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'

export const paymentAttemptStatusSchema = z.enum([
  'initiated',
  'funded',
  'failed',
  'refunded',
  'cancelled',
])

export const checkoutStatusSchema = z.enum(['pending', 'paid', 'failed', 'cancelled', 'refunded'])

export interface CheckoutStatusResponse {
  version: typeof PAY_CONTRACT_VERSION
  order_id: string
  order: CheckoutOrder
  checkout_status: CheckoutStatus
  /** Terminal states are `paid`, `refunded`, and order-level `cancelled`. Stop polling. */
  terminal: boolean
  /** When true, stop automatic polling and offer another attempt. */
  retryable: boolean
  amount: {
    currency: 'KES'
    /** Integer minor units. KES 1,250.00 === 125000. */
    minor_units: number
  }
  latest_attempt: {
    id: string
    sequence: number
    provider: ProviderId
    status: PaymentAttemptStatus
    terminal: boolean
    created_at: string
    updated_at: string
  } | null
  attempt_count: number
  order_updated_at: string
  status_updated_at: string
  /** Server clock, so clients can distinguish skew from elapsed confirmation time. */
  server_time: string
  /** Server-authored guidance (ms) for non-overlapping polling. Honor + jitter. */
  poll_after_ms: number
}

export const checkoutStatusResponseSchema = z.object({
  version: z.literal(PAY_CONTRACT_VERSION),
  order_id: z.string(),
  order: checkoutOrderSchema,
  checkout_status: checkoutStatusSchema,
  terminal: z.boolean(),
  retryable: z.boolean(),
  amount: z.object({
    currency: z.literal('KES'),
    minor_units: z.number().int(),
  }),
  latest_attempt: z
    .object({
      id: z.string(),
      sequence: z.number(),
      provider: providerIdSchema,
      status: paymentAttemptStatusSchema,
      terminal: z.boolean(),
      created_at: z.string(),
      updated_at: z.string(),
    })
    .nullable(),
  attempt_count: z.number().int(),
  order_updated_at: z.string(),
  status_updated_at: z.string(),
  server_time: z.string(),
  poll_after_ms: z.number().int().nonnegative(),
})
