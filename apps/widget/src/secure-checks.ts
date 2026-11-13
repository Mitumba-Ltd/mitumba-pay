import { sessionRefusal, type CheckoutSessionContext } from '@mitumba/pay-react'

/**
 * Checks the hosted widget runs before it renders any payment UI. Each one is a real condition of
 * the frame or the server-authored session; none is decorative. The overlay renders the checkout
 * only when every check passes, and refuses with the failing check's reason otherwise.
 */
export type SecureCheckId = 'connection' | 'frame' | 'merchant' | 'session' | 'methods'

export interface SecureCheck {
  id: SecureCheckId
  /** Shown while the check runs and after it passes. */
  label: string
  state: 'pending' | 'passed' | 'failed'
  /** Buyer-facing reason, set when the check fails. */
  reason?: string
}

/** Smallest frame the checkout renders in. A smaller frame is not the full-viewport overlay. */
export const MIN_FRAME = { width: 280, height: 360 } as const

export const CHECK_LABELS: Record<SecureCheckId, string> = {
  connection: 'Secure connection',
  frame: 'Protected payment window',
  merchant: 'Verified merchant',
  session: 'Your order',
  methods: 'Payment methods',
}

export interface FrameFacts {
  isSecureContext: boolean
  protocol: string
  hostname: string
  embedded: boolean
  /** Origin named by the launcher in `parent_origin`. */
  parentOrigin: string | null
  /** `document.referrer`, which carries the framing page's origin under default referrer policy. */
  referrer: string
  width: number
  height: number
}

export function readFrameFacts(): FrameFacts {
  return {
    isSecureContext: window.isSecureContext,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    embedded: window.parent !== window,
    parentOrigin: new URLSearchParams(window.location.search).get('parent_origin'),
    referrer: document.referrer,
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function originOf(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null
  } catch {
    return null
  }
}

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

/** HTTPS everywhere; plain HTTP only on loopback for local development. */
export function checkConnection(facts: FrameFacts): string | null {
  if (!facts.isSecureContext) return 'This payment window is not on a secure connection.'
  if (facts.protocol !== 'https:' && !isLoopback(facts.hostname)) {
    return 'This payment window is not on a secure connection.'
  }
  return null
}

/** Opened as an overlay by a page that named itself, at a size a person can see. */
export function checkFrame(facts: FrameFacts): string | null {
  if (!facts.embedded) return 'Open this payment from the store checkout.'
  const parent = originOf(facts.parentOrigin)
  if (!parent) return 'The store that opened this payment could not be identified.'
  const referred = originOf(facts.referrer)
  if (referred && referred !== parent) return 'This payment was opened by a different site than the one it names.'
  if (facts.width < MIN_FRAME.width || facts.height < MIN_FRAME.height) {
    return 'This payment window is too small to show safely.'
  }
  return null
}

/** The session was created for the site that is framing it now. */
export function checkMerchant(context: CheckoutSessionContext, parentOrigin: string | null): string | null {
  const bound = originOf(context.parent_origin)
  if (!bound || bound !== originOf(parentOrigin)) {
    return 'This payment belongs to a different store. Close this window and start again from the checkout.'
  }
  return null
}

/** Still open, and not past its expiry by the server's clock. Shared with the native sheet. */
export function checkSession(context: CheckoutSessionContext): string | null {
  const refusal = sessionRefusal(context)
  return refusal && refusal.code !== 'no_payable_method' ? refusal.message : null
}

/** At least one method the widget can take a payment with now. Shared with the native sheet. */
export function checkMethods(context: CheckoutSessionContext): string | null {
  const refusal = sessionRefusal(context)
  return refusal?.code === 'no_payable_method' ? refusal.message : null
}

export function pendingChecks(): SecureCheck[] {
  return (Object.keys(CHECK_LABELS) as SecureCheckId[]).map((id) => ({ id, label: CHECK_LABELS[id], state: 'pending' }))
}

/** Marks `id` passed, or failed with `reason`. */
export function settle(checks: SecureCheck[], id: SecureCheckId, reason: string | null): SecureCheck[] {
  return checks.map((check) =>
    check.id === id ? { ...check, state: reason ? 'failed' : 'passed', reason: reason ?? undefined } : check,
  )
}

export function firstFailure(checks: SecureCheck[]): SecureCheck | null {
  return checks.find((check) => check.state === 'failed') ?? null
}

export function allPassed(checks: SecureCheck[]): boolean {
  return checks.every((check) => check.state === 'passed')
}
