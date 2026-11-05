import { z } from 'zod'
import { PAY_CONTRACT_VERSION } from './version'
import { moneySchema, type Money } from './money'
import { paymentMethodTypeSchema, type PaymentMethodType } from './market'

/**
 * Checkout sessions (RFC 0001 ยง6-8). A session is the long-term public
 * authority for a payment: one session represents one payable subject, one
 * market, one currency, and one authoritative total. The client never asserts
 * country, currency, amount, or provider — all are session-derived server-side.
 *
 * All shapes stay at wire version 1 and live alongside the legacy order-based
 * initiate/status contract, which remains a compatibility surface.
 */

// ---------------------------------------------------------------------------
// Session creation
// ---------------------------------------------------------------------------

/**
 * The subject a checkout session is created for. Today only marketplace orders;
 * `type` is a discriminant so external-merchant subjects can be added later.
 */
export type CheckoutSessionSource = { type: 'order'; id: string }

export const checkoutSessionSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('order'), id: z.string().min(1) }),
])

/**
 * Browser/marketplace session creation input. No country, amount, currency,
 * email, or provider — all are derived from the order server-side. Origins and
 * return/cancel URLs are validated as absolute HTTPS by the backend.
 */
export interface CreateCheckoutSessionInput {
  source: CheckoutSessionSource
  parent_origin: string
  return_url?: string
  cancel_url?: string
}

export const createCheckoutSessionInputSchema = z.object({
  source: checkoutSessionSourceSchema,
  parent_origin: z.string().url(),
  return_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
})

export interface CreateCheckoutSessionResponse {
  version: typeof PAY_CONTRACT_VERSION
  session_id: string
  /** Opaque high-entropy secret, shown once, scoped to this session. */
  client_secret: string
  expires_at: string
  hosted_url: string
}

export const createCheckoutSessionResponseSchema = z.object({
  version: z.literal(PAY_CONTRACT_VERSION),
  session_id: z.string().min(1),
  client_secret: z.string().min(1),
  expires_at: z.string(),
  hosted_url: z.string().url(),
})

// ---------------------------------------------------------------------------
// Session status (shared by context and status resources)
// ---------------------------------------------------------------------------

/** Lifecycle of the session resource itself. */
export type CheckoutSessionStatus = 'open' | 'processing' | 'complete' | 'expired' | 'cancelled'

export const checkoutSessionStatusSchema = z.enum([
  'open',
  'processing',
  'complete',
  'expired',
  'cancelled',
])

// ---------------------------------------------------------------------------
// Authoritative checkout context and available methods
// ---------------------------------------------------------------------------

/** How a method descriptor requests one piece of buyer input. */
export interface CheckoutInputField {
  name: string
  type: 'tel' | 'text'
  required: boolean
  label: string
  calling_code?: string
  example?: string
}

export const checkoutInputFieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['tel', 'text']),
  required: z.boolean(),
  label: z.string().min(1),
  calling_code: z.string().optional(),
  example: z.string().optional(),
})

/**
 * A payment method the session makes available. Provider names never appear
 * here — only the buyer-visible method type and the inputs it needs.
 */
export interface CheckoutMethodDescriptor {
  type: PaymentMethodType
  display_name: string
  status: 'available' | 'temporarily_unavailable'
  input_fields: CheckoutInputField[]
}

export const checkoutMethodDescriptorSchema = z.object({
  type: paymentMethodTypeSchema,
  display_name: z.string().min(1),
  status: z.enum(['available', 'temporarily_unavailable']),
  input_fields: z.array(checkoutInputFieldSchema),
})

export interface CheckoutLineItem {
  label: string
  amount: Money
}

export const checkoutLineItemSchema = z.object({
  label: z.string().min(1),
  amount: moneySchema,
})

/**
 * Immutable display/configuration context for a session, read with the session
 * client secret. The UI renders ONLY the methods returned here. Initiation still
 * revalidates availability to handle a race after context was loaded.
 */
export interface CheckoutSessionContext {
  version: typeof PAY_CONTRACT_VERSION
  session_id: string
  session_status: CheckoutSessionStatus
  market: { code: string; name: string }
  amount: Money
  line_items: CheckoutLineItem[]
  reference: string
  available_methods: CheckoutMethodDescriptor[]
  parent_origin: string
  return_url: string | null
  cancel_url: string | null
  expires_at: string
  server_time: string
}

export const checkoutSessionContextSchema = z.object({
  version: z.literal(PAY_CONTRACT_VERSION),
  session_id: z.string().min(1),
  session_status: checkoutSessionStatusSchema,
  market: z.object({ code: z.string().min(1), name: z.string().min(1) }),
  amount: moneySchema,
  line_items: z.array(checkoutLineItemSchema),
  reference: z.string(),
  available_methods: z.array(checkoutMethodDescriptorSchema),
  parent_origin: z.string(),
  return_url: z.string().nullable(),
  cancel_url: z.string().nullable(),
  expires_at: z.string(),
  server_time: z.string(),
})
