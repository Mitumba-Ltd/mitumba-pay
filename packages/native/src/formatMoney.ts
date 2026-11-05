import type { Money } from '@mitumba/pay'

/**
 * Format a provider-neutral {@link Money} for display. Uses Intl when a locale
 * is available, falling back to a plain `CODE 1,234.56` rendering. The number
 * of decimal places is derived from `minorUnitDigits` (default 2) so a
 * zero-decimal currency renders without a fractional part.
 *
 * Amounts and currency come from the authoritative session context; this never
 * invents or converts a value.
 */
export function formatMoney(money: Money, locale?: string, minorUnitDigits = 2): string {
  const major = money.minor_units / 10 ** minorUnitDigits
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
      minimumFractionDigits: minorUnitDigits,
      maximumFractionDigits: minorUnitDigits,
    }).format(major)
  } catch {
    const fixed = major.toFixed(minorUnitDigits)
    const withGroups = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return `${money.currency} ${withGroups}`
  }
}
