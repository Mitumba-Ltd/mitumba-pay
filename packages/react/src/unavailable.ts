/**
 * The words for the `unavailable` phase (HTTP 503: payments paused by the platform, or the provider
 * for this method unreachable). It is not a failure: nothing was charged, and trying later works.
 */
export function unavailableMessage(retryAfterMs: number | null | undefined): string {
  const base = 'Payments are temporarily unavailable. Nothing was charged.'
  if (retryAfterMs === null || retryAfterMs === undefined) return `${base} Please try again shortly.`
  const minutes = Math.ceil(retryAfterMs / 60_000)
  if (minutes <= 1) return `${base} Please try again in a minute.`
  if (minutes < 60) return `${base} Please try again in about ${String(minutes)} minutes.`
  const hours = Math.round(minutes / 60)
  return `${base} Please try again in about ${String(hours)} hour${hours === 1 ? '' : 's'}.`
}
