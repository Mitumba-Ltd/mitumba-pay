/**
 * Format a provider-neutral Money for display. The shared implementation in @mitumba/pay divides by
 * the currency's own minor unit (KES 2, UGX 0), so a zero-decimal currency is never shown a hundred
 * times too small. Kept as this package's export so existing imports keep working.
 */
export { formatMoney } from '@mitumba/pay'
