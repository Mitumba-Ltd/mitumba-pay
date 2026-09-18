import { z } from 'zod'

/**
 * Providers Mitumba Pay is known to route to today. This list exists purely for
 * editor autocomplete and documentation.
 *
 * IMPORTANT: provider identifiers are *observable metadata*, never a client-side
 * routing choice. The backend selects the collection provider; the client only
 * ever chooses a payment *method*. Consumers must NOT branch on an exhaustive
 * provider switch to decide how checkout continues — use `next_action` instead.
 */
export type KnownPaymentProvider = 'daraja' | 'intasend' | 'paystack' | 'airtel'

/**
 * A provider identifier as returned by the backend. The open `(string & {})`
 * member is deliberate: the backend can add a new provider (MTN MoMo, Vodacom,
 * etc.) and return it here WITHOUT requiring a new SDK release. Never treat this
 * as a closed set.
 */
export type ProviderId = KnownPaymentProvider | (string & {})

export const KNOWN_PAYMENT_PROVIDERS: readonly KnownPaymentProvider[] = [
  'daraja',
  'intasend',
  'paystack',
  'airtel',
] as const

/** Accepts any non-empty string — provider ids are open by contract. */
export const providerIdSchema = z.string().min(1)
