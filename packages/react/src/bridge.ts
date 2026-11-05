/**
 * Mitumba Pay hosted-checkout bridge, version 2 (RFC 0001 ยง9).
 *
 * V2 passes only a session id + client secret across the iframe boundary. It
 * never accepts a client-authored amount, currency, country, methods, or line
 * items — the widget loads all display data from the session context it fetches
 * itself. (The legacy V1 bridge, which passed order/token/amount, remains
 * compatibility-only in the private widget app.)
 *
 * Both parent (launcher) and child (widget) must validate every message's
 * version, origin, source, and payload before acting on it.
 */

export const BRIDGE_VERSION_V2 = 2 as const

export const MITUMBA_PAY_MESSAGE = {
  /** child -> parent: widget mounted and ready to receive INIT. */
  ready: 'MITUMBA_PAY_READY',
  /** parent -> child: session id + client secret. */
  init: 'MITUMBA_PAY_INIT',
  /** child -> parent: user/close request. */
  close: 'MITUMBA_PAY_CLOSE',
  /** child -> parent: lifecycle update. */
  status: 'MITUMBA_PAY_STATUS',
  /** child -> parent: terminal success. */
  complete: 'MITUMBA_PAY_COMPLETE',
  /** child -> parent: content size for overlay fit. */
  resize: 'MITUMBA_PAY_RESIZE',
  /** child -> parent: a version/contract mismatch; parent should update. */
  updateRequired: 'MITUMBA_PAY_UPDATE_REQUIRED',
} as const

export type MitumbaPayMessageType =
  (typeof MITUMBA_PAY_MESSAGE)[keyof typeof MITUMBA_PAY_MESSAGE]

/** The only payload the parent sends the widget in V2. */
export interface BridgeInitPayload {
  session_id: string
  client_secret: string
}

export interface BridgeInitMessage {
  type: typeof MITUMBA_PAY_MESSAGE.init
  version: typeof BRIDGE_VERSION_V2
  payload: BridgeInitPayload
}

/** Envelope for any V2 message. `payload` shape depends on `type`. */
export interface BridgeMessage<T = unknown> {
  type: MitumbaPayMessageType
  version: typeof BRIDGE_VERSION_V2
  payload?: T
}

/** Narrow an unknown value to a well-formed V2 envelope of a given type. */
export function isBridgeMessage(
  value: unknown,
  type: MitumbaPayMessageType,
): value is BridgeMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as Partial<BridgeMessage>
  return message.type === type && message.version === BRIDGE_VERSION_V2
}

/** Narrow an unknown value to a well-formed V2 INIT message. */
export function isBridgeInitMessage(value: unknown): value is BridgeInitMessage {
  if (!isBridgeMessage(value, MITUMBA_PAY_MESSAGE.init)) return false
  const payload = (value as BridgeInitMessage).payload as Partial<BridgeInitPayload> | undefined
  return (
    typeof payload?.session_id === 'string' &&
    payload.session_id.length > 0 &&
    typeof payload.client_secret === 'string' &&
    payload.client_secret.length > 0
  )
}
