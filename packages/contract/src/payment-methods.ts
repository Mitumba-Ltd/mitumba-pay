import { z } from 'zod'
import { E164_PHONE } from './checkout'
import { PAY_CONTRACT_VERSION } from './version'

/**
 * A buyer's saved payment method (ADR-012): provider-neutral and scoped to one market, offered as a
 * one-tap choice at checkout. Only mobile money can be saved; a reusable card needs a provider token,
 * which no integrated provider issues yet, so saving a card is rejected with
 * `422 payment_method_not_savable`.
 */
export interface SavedPaymentMethod {
  id: string
  /** ISO 3166-1 alpha-2 market the method belongs to, e.g. "KE". */
  market_code: string
  /** The method as `initiateCheckout` / `createAttempt` take it: send it unchanged to pay. */
  method: { type: 'mobile_money'; phone: string }
  label: string
  /** The method to preselect in this market. At most one per market. */
  is_default: boolean
  created_at: string
}

export const savedPaymentMethodSchema = z.object({
  id: z.string().min(1),
  market_code: z.string().regex(/^[A-Z]{2}$/),
  method: z.object({ type: z.literal('mobile_money'), phone: z.string().regex(E164_PHONE) }),
  label: z.string().min(1),
  is_default: z.boolean(),
  created_at: z.string(),
})

/** `GET /pay/payment-methods?market=KE`: the buyer's methods in one market, default first. */
export interface SavedPaymentMethodsResponse {
  version: typeof PAY_CONTRACT_VERSION
  market_code: string
  data: SavedPaymentMethod[]
}

export const savedPaymentMethodsResponseSchema = z.object({
  version: z.literal(PAY_CONTRACT_VERSION),
  market_code: z.string().regex(/^[A-Z]{2}$/),
  data: z.array(savedPaymentMethodSchema),
})

/**
 * `POST /pay/payment-methods`. The phone may be in any local form (`0712 345 678`); the backend
 * normalizes it for the market and answers `400 invalid_phone` when it cannot. Saving a number that is
 * already saved returns it (200) instead of a duplicate, applying `label` and `make_default`.
 */
export interface SavePaymentMethodInput {
  market_code: string
  method: { type: 'mobile_money'; phone: string }
  /** 1 to 40 characters. Defaults to "Mobile money". */
  label?: string
  /** Make it the market's default. The first saved method in a market always becomes the default. */
  make_default?: boolean
}

export const savePaymentMethodInputSchema = z.object({
  market_code: z.string().min(1),
  method: z.object({ type: z.literal('mobile_money'), phone: z.string().trim().min(1) }),
  label: z.string().trim().min(1).max(40).optional(),
  make_default: z.boolean().optional(),
})

/** A single saved method, as save and set-default return it. */
export interface SavedPaymentMethodEnvelope {
  data: SavedPaymentMethod
}

export const savedPaymentMethodEnvelopeSchema = z.object({ data: savedPaymentMethodSchema })

/** Error codes the saved-methods routes emit. */
export type SavedPaymentMethodErrorCode =
  | 'unauthorized'
  | 'invalid_input'
  | 'invalid_phone'
  | 'market_not_found'
  | 'market_not_active'
  | 'payment_method_not_savable'
  | 'not_found'
