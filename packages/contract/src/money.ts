import { z } from 'zod'

/**
 * A provider-neutral, market-neutral monetary amount.
 *
 * Replaces the legacy `{ currency: 'KES'; minor_units }` shape used by the
 * order-based checkout-status contract. New session contracts use open ISO 4217
 * currency strings so adding a market never requires an SDK release.
 *
 * `minor_units` is the amount in the currency's smallest indivisible unit
 * (e.g. KES 1,250.00 === 125000 cents). It is always a nonnegative safe integer:
 * response validation rejects negative, fractional, or overflowing amounts so a
 * malformed backend amount can never be interpreted as a payable total.
 */
export interface Money {
  /** ISO 4217 currency code, e.g. "KES". Open string — not a closed enum. */
  currency: string
  /** Amount in minor units. Nonnegative `Number.isSafeInteger`. */
  minor_units: number
}

/**
 * ISO 4217 is three uppercase letters. Validated by format, not by a closed
 * list, so a new market's currency parses without an SDK release.
 */
export const currencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, 'currency must be an ISO 4217 alpha-3 code')

/**
 * Minor-unit amounts must be nonnegative safe integers. `z.number().int()`
 * alone would admit values beyond `Number.MAX_SAFE_INTEGER`; the explicit
 * `Number.isSafeInteger` refinement rejects overflow that would silently lose
 * precision.
 */
export const minorUnitsSchema = z
  .number()
  .int()
  .nonnegative()
  .refine(Number.isSafeInteger, 'minor_units must be a safe integer')

export const moneySchema = z.object({
  currency: currencyCodeSchema,
  minor_units: minorUnitsSchema,
}) satisfies z.ZodType<Money>
