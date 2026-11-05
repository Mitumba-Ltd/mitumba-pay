import { z } from 'zod'
import { PAY_CONTRACT_VERSION } from './version'

/**
 * A payment *method type* a market or checkout session may expose. This is the
 * buyer-visible payment network/rail (e.g. "mobile_money", "card") — NOT the
 * backend processor.
 *
 * It is deliberately open (`string & {}`): the backend can expose a new method
 * such as "airtel_money" or "bank_transfer" WITHOUT an SDK release. The
 * authoritative, renderable method set for a specific payment is a checkout
 * session's `available_methods`; a market's list is informational only.
 *
 * The distinction the client must respect:
 * - The buyer chooses a *method type* (which payment network their money moves
 *   on — e.g. M-Pesa vs card). This is buyer-facing and cannot be substituted
 *   by the backend.
 * - The backend chooses the *provider/aggregator* used to reach that network
 *   (e.g. Daraja vs Intasend for M-Pesa). That choice is never exposed as a
 *   client branch — the client follows `next_action`.
 */
export type KnownPaymentMethod = 'mobile_money' | 'card'
export type PaymentMethodType = KnownPaymentMethod | (string & {})

export const KNOWN_PAYMENT_METHODS: readonly KnownPaymentMethod[] = [
  'mobile_money',
  'card',
] as const

/** Accepts any non-empty string — method types are open by contract. */
export const paymentMethodTypeSchema = z.string().min(1)

/** Market lifecycle as surfaced to clients for discovery/browsing. */
export type MarketStatus = 'active' | 'coming_soon'

export const marketStatusSchema = z.enum(['active', 'coming_soon'])

/** The currency a market transacts in. Codes are open, validated by format. */
export interface MarketCurrency {
  /** ISO 4217 alpha-3, e.g. "KES". */
  code: string
  /** Number of minor-unit decimal places, e.g. 2. */
  minor_unit: number
  /** Display symbol, e.g. "KSh". */
  symbol: string
  /** BCP 47 locale for formatting, e.g. "en-KE". */
  locale: string
}

export const marketCurrencySchema = z.object({
  code: z.string().regex(/^[A-Z]{3}$/),
  minor_unit: z.number().int().nonnegative(),
  symbol: z.string().min(1),
  locale: z.string().min(1),
})

/**
 * A market the platform exposes. `code` and `supported_methods` are open
 * strings so adding a country never requires an SDK release. `supported_methods`
 * is informational ("generally supported here"); only a checkout session's
 * `available_methods` is authoritative for a specific payment.
 */
export interface Market {
  /** ISO 3166-1 alpha-2, e.g. "KE". */
  code: string
  /** Human-readable name, e.g. "Kenya". */
  name: string
  status: MarketStatus
  currency: MarketCurrency
  /** E.164 calling code, e.g. "+254". */
  calling_code: string
  /** Informational — not checkout authority. */
  supported_methods: PaymentMethodType[]
}

export const marketSchema = z.object({
  code: z.string().regex(/^[A-Z]{2}$/),
  name: z.string().min(1),
  status: marketStatusSchema,
  currency: marketCurrencySchema,
  calling_code: z.string().regex(/^\+\d{1,4}$/),
  supported_methods: z.array(paymentMethodTypeSchema),
})

/** Response of `GET /pay/markets` — public, cacheable market discovery. */
export interface MarketsResponse {
  version: typeof PAY_CONTRACT_VERSION
  markets: Market[]
  updated_at: string
}

export const marketsResponseSchema = z.object({
  version: z.literal(PAY_CONTRACT_VERSION),
  markets: z.array(marketSchema),
  updated_at: z.string(),
})
