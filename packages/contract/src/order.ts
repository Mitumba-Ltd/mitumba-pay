import { z } from 'zod'

/** Retail order lifecycle, mirrored from the backend's public projection. */
export type RetailOrderStatus =
  | 'created'
  | 'payment_pending'
  | 'paid'
  | 'seller_confirmed'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed'

/** Wholesale ("bale") order lifecycle. */
export type BaleOrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'confirmed'
  | 'in_transit'
  | 'delivered'
  | 'completed'
  | 'cancelled'

/**
 * Discriminated order projection returned inside a checkout-status response.
 * `type` selects which raw status union applies.
 */
export type CheckoutOrder =
  | { type: 'retail'; status: RetailOrderStatus }
  | { type: 'bale'; status: BaleOrderStatus }

export const retailOrderStatusSchema = z.enum([
  'created',
  'payment_pending',
  'paid',
  'seller_confirmed',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'disputed',
])

export const baleOrderStatusSchema = z.enum([
  'pending_payment',
  'paid',
  'confirmed',
  'in_transit',
  'delivered',
  'completed',
  'cancelled',
])

export const checkoutOrderSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('retail'), status: retailOrderStatusSchema }),
  z.object({ type: z.literal('bale'), status: baleOrderStatusSchema }),
])
