import type { Money } from '@mitumba/pay-contract'

/**
 * Decimal places in a currency's minor unit, per ISO 4217 as the runtime's Intl data knows it (KES 2,
 * UGX 0, KWD 3). Falls back to 2 when the runtime cannot answer.
 */
export function currencyDigits(currency: string): number {
  try {
    const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits
    return typeof digits === 'number' && Number.isInteger(digits) && digits >= 0 ? digits : 2
  } catch {
    return 2
  }
}

/**
 * Format a provider-neutral {@link Money} for display. `minor_units` is divided by the currency's own
 * minor unit, so a zero-decimal currency is never shown a hundred times too small. The locale comes
 * from the host's market (e.g. `en-KE`); omitted, the runtime default is used. Falls back to a plain
 * `CODE 1,234.56` when Intl rejects the locale or currency.
 *
 * Amounts and currency come from the authoritative response; this never invents or converts a value.
 */
export function formatMoney(money: Money, locale?: string, digits: number = currencyDigits(money.currency)): string {
  const major = money.minor_units / 10 ** digits
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(major)
  } catch {
    const fixed = major.toFixed(digits)
    const [whole = '0', fraction] = fixed.split('.')
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return `${money.currency} ${fraction === undefined ? grouped : `${grouped}.${fraction}`}`
  }
}
