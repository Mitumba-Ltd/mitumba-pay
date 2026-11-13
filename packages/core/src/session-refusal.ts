import type { CheckoutSessionContext } from '@mitumba/pay-contract'

/** Why a loaded session cannot take a payment from this checkout. */
export type SessionRefusalCode = 'already_paid' | 'expired' | 'cancelled' | 'no_payable_method'

export interface SessionRefusal {
  code: SessionRefusalCode
  /** Buyer-facing explanation. */
  message: string
}

const MESSAGE: Record<SessionRefusalCode, string> = {
  already_paid: 'This order is already paid.',
  expired: 'This payment has expired. Close this and check out again.',
  cancelled: 'This payment was cancelled. Close this and check out again.',
  no_payable_method: 'No payment method is available for this order right now. Please try again shortly.',
}

function refusal(code: SessionRefusalCode): SessionRefusal {
  return { code, message: MESSAGE[code] }
}

/**
 * Whether a session can be paid now, judged only from its authoritative context: its status, its
 * expiry against the server's clock (never the device's), and whether any offered method can be paid
 * by this client. Returns null when the payment UI may render.
 */
export function sessionRefusal(context: CheckoutSessionContext): SessionRefusal | null {
  if (context.session_status === 'complete') return refusal('already_paid')
  if (context.session_status === 'expired') return refusal('expired')
  if (context.session_status === 'cancelled') return refusal('cancelled')
  const expires = Date.parse(context.expires_at)
  const now = Date.parse(context.server_time)
  if (Number.isFinite(expires) && Number.isFinite(now) && expires <= now) return refusal('expired')
  const payable = context.available_methods.some(
    (method) =>
      method.status === 'available' &&
      (method.type === 'card' || (method.type === 'mobile_money' && Boolean(method.network))),
  )
  return payable ? null : refusal('no_payable_method')
}
