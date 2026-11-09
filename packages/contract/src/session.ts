import { z } from 'zod'
import { PAY_CONTRACT_VERSION } from './version'
import { moneySchema, type Money } from './money'
import { paymentMethodTypeSchema, type PaymentMethodType } from './market'
import { type CheckoutNextAction, checkoutNextActionSchema, mobileMoneyMethodSchema } from './checkout'

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
 *
 * Mobile money comes as one descriptor per network (e.g. "M-Pesa", "Airtel Money"), each carrying its
 * `network`, so the buyer picks their wallet directly. Send that `network` back in the attempt. Use
 * {@link methodDescriptorKey} to tell descriptors of the same type apart.
 */
export interface CheckoutMethodDescriptor {
  type: PaymentMethodType
  /** For mobile money: the network this descriptor pays from, e.g. "mpesa". */
  network?: string
  display_name: string
  status: 'available' | 'temporarily_unavailable'
  input_fields: CheckoutInputField[]
}

export const checkoutMethodDescriptorSchema = z.object({
  type: paymentMethodTypeSchema,
  network: z.string().min(1).optional(),
  display_name: z.string().min(1),
  status: z.enum(['available', 'temporarily_unavailable']),
  input_fields: z.array(checkoutInputFieldSchema),
})

/** A key unique within a session's `available_methods`: the type, plus the network when it has one. */
export function methodDescriptorKey(descriptor: Pick<CheckoutMethodDescriptor, 'type' | 'network'>): string {
  return descriptor.network ? `${descriptor.type}:${descriptor.network}` : descriptor.type
}

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

// ---------------------------------------------------------------------------
// Attempt initiation
// ---------------------------------------------------------------------------

// `E164_PHONE` lives in ./checkout and is shared by the order-based and session contracts: neither
// locks a phone to one country; the backend validates the number against the order's or session's
// market (ADR-010).

/**
 * Buyer-selected method for a session attempt. The client picks a method type
 * and supplies its required input; the backend picks the provider. Mobile money
 * names the descriptor's `network`. Card carries no PAN/CVV/token/email — the
 * backend obtains buyer identity itself.
 */
export type SessionPaymentMethod =
  | { type: 'mobile_money'; network: string; phone: string }
  | { type: 'card' }

export const sessionPaymentMethodSchema = z.discriminatedUnion('type', [
  mobileMoneyMethodSchema,
  z.object({ type: z.literal('card') }),
])

/**
 * Body of `POST /pay/checkout-sessions/:session_id/attempts`. No country — the
 * session is authoritative for market, amount, and currency.
 */
export interface CreateAttemptInput {
  idempotency_key: string
  method: SessionPaymentMethod
}

export const createAttemptInputSchema = z.object({
  idempotency_key: z.string().min(1),
  method: sessionPaymentMethodSchema,
})

/**
 * What the client must do after an attempt. Provider-neutral: wait for an
 * out-of-band confirmation, or open an absolute HTTPS redirect. This is the
 * same shape as the legacy order-based `CheckoutNextAction` (reused, not
 * redeclared, to keep one canonical type).
 */
export const sessionNextActionSchema = checkoutNextActionSchema

// ---------------------------------------------------------------------------
// Attempt projection and session status
// ---------------------------------------------------------------------------

/** Per-attempt payment state. Only `initiated` is non-terminal. */
export type SessionAttemptStatus = 'initiated' | 'funded' | 'failed' | 'refunded' | 'cancelled'

export const sessionAttemptStatusSchema = z.enum([
  'initiated',
  'funded',
  'failed',
  'refunded',
  'cancelled',
])

/** Public projection of one payment attempt within a session. */
export interface CheckoutAttempt {
  id: string
  sequence: number
  /** Observable metadata only — never drives client continuation. */
  provider: string
  status: SessionAttemptStatus
  terminal: boolean
  next_action: CheckoutNextAction | null
  created_at: string
  updated_at: string
}

export const checkoutAttemptSchema = z.object({
  id: z.string(),
  sequence: z.number().int(),
  provider: z.string().min(1),
  status: sessionAttemptStatusSchema,
  terminal: z.boolean(),
  next_action: sessionNextActionSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

/** Aggregate, buyer-visible checkout state for a session. */
export type SessionCheckoutStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'

export const sessionCheckoutStatusSchema = z.enum([
  'pending',
  'paid',
  'failed',
  'cancelled',
  'refunded',
])

/**
 * Response of the session status resource (distinct from context). A retryable
 * failed/cancelled attempt returns the session to `open`; the client offers
 * another attempt with a new idempotency key. `complete`, `expired`, and
 * session-level `cancelled` are terminal. Unknown states stay `pending` and are
 * never converted to failure by elapsed client time alone.
 */
export interface CheckoutSessionStatusResponse {
  version: typeof PAY_CONTRACT_VERSION
  session_id: string
  session_status: CheckoutSessionStatus
  checkout_status: SessionCheckoutStatus
  terminal: boolean
  retryable: boolean
  latest_attempt: CheckoutAttempt | null
  server_time: string
  /** Server-authored guidance (ms) for non-overlapping polling. Honor + jitter. */
  poll_after_ms: number
}

export const checkoutSessionStatusResponseSchema = z.object({
  version: z.literal(PAY_CONTRACT_VERSION),
  session_id: z.string().min(1),
  session_status: checkoutSessionStatusSchema,
  checkout_status: sessionCheckoutStatusSchema,
  terminal: z.boolean(),
  retryable: z.boolean(),
  latest_attempt: checkoutAttemptSchema.nullable(),
  server_time: z.string(),
  poll_after_ms: z.number().int().nonnegative(),
})
