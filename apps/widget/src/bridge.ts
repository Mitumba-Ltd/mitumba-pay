import type {
  WidgetLineItem,
  WidgetMetadataItem,
  WidgetMethod,
  WidgetSavedPhone,
} from '@mitumba/pay-react'

export const BRIDGE_VERSION = 1 as const
export const MESSAGE = {
  init: 'MITUMBA_PAY_INIT',
  ready: 'MITUMBA_PAY_READY',
  close: 'MITUMBA_PAY_CLOSE',
  status: 'MITUMBA_PAY_STATUS',
  complete: 'MITUMBA_PAY_COMPLETE',
  resize: 'MITUMBA_PAY_RESIZE',
} as const

export interface HostedCheckoutConfig {
  orderId: string
  token: string
  amountLabel: string
  totalLabel?: string
  lineItems?: WidgetLineItem[]
  metadata?: WidgetMetadataItem[]
  merchantName?: string
  defaultPhone?: string
  savedPhones?: WidgetSavedPhone[]
  methods?: WidgetMethod[]
  supportLabel?: string
  supportHref?: string
  baseUrl?: string
  idempotencyKey?: string
}

export interface InitMessage {
  type: typeof MESSAGE.init
  version: typeof BRIDGE_VERSION
  payload: HostedCheckoutConfig
}

export function isInitMessage(value: unknown): value is InitMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as Partial<InitMessage>
  const payload = message.payload as Partial<HostedCheckoutConfig> | undefined
  return (
    message.type === MESSAGE.init &&
    message.version === BRIDGE_VERSION &&
    typeof payload?.orderId === 'string' &&
    payload.orderId.length > 0 &&
    typeof payload.token === 'string' &&
    payload.token.length > 0 &&
    typeof payload.amountLabel === 'string' &&
    payload.amountLabel.length > 0
  )
}

export function parentOrigin(): string | null {
  const configured = new URLSearchParams(window.location.search).get('parent_origin')
  if (configured) return parseWebOrigin(configured)
  if (!document.referrer) return null
  return parseWebOrigin(document.referrer)
}

function parseWebOrigin(value: string): string | null {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.origin : null
  } catch {
    return null
  }
}

export function postToParent(origin: string | null, type: string, payload?: unknown): boolean {
  if (window.parent === window || !origin) return false
  window.parent.postMessage({ type, version: BRIDGE_VERSION, payload }, origin)
  return true
}
