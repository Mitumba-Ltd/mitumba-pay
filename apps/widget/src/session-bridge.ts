import {
  BRIDGE_VERSION_V2,
  MITUMBA_PAY_MESSAGE,
  isBridgeInitMessage,
  type BridgeInitPayload,
} from '@mitumba/pay-react'

/**
 * Child (widget) side of the hosted-checkout Bridge V2 (RFC 0001 ยง9).
 *
 * The launcher passes `parent_origin` as a query param; the widget trusts
 * messages only from that exact origin and from `window.parent`. The only
 * inbound payload it accepts is INIT's session id + client secret — it then
 * loads all display data from session context itself.
 */

export function readParentOrigin(): string | null {
  const configured = new URLSearchParams(window.location.search).get('parent_origin')
  const candidate = configured ?? (document.referrer || '')
  if (!candidate) return null
  try {
    const parsed = new URL(candidate)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.origin : null
  } catch {
    return null
  }
}

export function postToParent(origin: string | null, type: string, payload?: unknown): boolean {
  if (window.parent === window || !origin) return false
  window.parent.postMessage({ type, version: BRIDGE_VERSION_V2, payload }, origin)
  return true
}

/**
 * Subscribe to the parent's INIT message. Validates version, exact origin, and
 * source before surfacing the session id + secret. Returns an unsubscribe fn.
 */
export function onInit(
  parentOrigin: string | null,
  handler: (payload: BridgeInitPayload) => void,
): () => void {
  const listener = (event: MessageEvent<unknown>) => {
    if (event.source !== window.parent) return
    if (!parentOrigin || event.origin !== parentOrigin) return
    if (!isBridgeInitMessage(event.data)) return
    handler(event.data.payload)
  }
  window.addEventListener('message', listener)
  return () => window.removeEventListener('message', listener)
}

export const CHILD_MESSAGE = MITUMBA_PAY_MESSAGE
