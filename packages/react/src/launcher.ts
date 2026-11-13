import {
  BRIDGE_VERSION_V2,
  MITUMBA_PAY_MESSAGE,
  isBridgeMessage,
  type BridgeMessage,
} from './bridge'

/**
 * Framework-neutral launcher for Mitumba Pay hosted checkout (RFC 0001 ยง9).
 *
 * Creates a fixed, full-viewport iframe overlay pointed at the hosted widget,
 * performs READY/INIT version negotiation, and relays only a session id +
 * client secret (Bridge V2). It owns overlay lifecycle, exact origin/source
 * checks in both directions, Escape/close/completion handling, scroll lock, and
 * focus restoration. It never passes a client-authored amount, currency,
 * country, methods, or line items — the widget loads display data from session
 * context itself.
 *
 * Usage:
 *   const result = await openMitumbaPay({
 *     sessionId: session.session_id,
 *     clientSecret: session.client_secret,
 *   })
 */

/** Default hosted widget origin. Override for staging/self-hosting. */
export const DEFAULT_HOSTED_WIDGET_URL = 'https://pay.mitumba.africa/widget'

export interface OpenMitumbaPayOptions {
  sessionId: string
  clientSecret: string
  /** Hosted widget URL. Defaults to {@link DEFAULT_HOSTED_WIDGET_URL}. */
  widgetUrl?: string
  /** Fired on every STATUS message from the widget. */
  onStatus?: (payload: unknown) => void
  /** Overall client-side timeout (ms) before the overlay auto-closes. Default 600000 (10 min). */
  timeoutMs?: number
}

/** How a launched checkout overlay ended. */
export type MitumbaPayOutcome = 'complete' | 'closed' | 'timeout' | 'update_required'

export interface MitumbaPayResult {
  outcome: MitumbaPayOutcome
  /** The COMPLETE payload for a terminal success, else null. */
  status: unknown
}

const OVERLAY_ID = 'mitumba-pay-overlay'

function sameOrigin(url: string): string {
  return new URL(url).origin
}

/**
 * Opens the hosted checkout overlay and resolves when it reaches a terminal
 * outcome (completion, user close, timeout, or a version/contract mismatch).
 * Safe to call only in a browser; throws if there is no DOM.
 */
export function openMitumbaPay(options: OpenMitumbaPayOptions): Promise<MitumbaPayResult> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('openMitumbaPay can only run in a browser environment.')
  }
  if (document.getElementById(OVERLAY_ID)) {
    throw new Error('A Mitumba Pay checkout overlay is already open.')
  }

  const widgetUrl = options.widgetUrl ?? DEFAULT_HOSTED_WIDGET_URL
  const widgetOrigin = sameOrigin(widgetUrl)
  const parentOrigin = window.location.origin
  const timeoutMs = options.timeoutMs ?? 600_000

  return new Promise<MitumbaPayResult>((resolve) => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const overlay = document.createElement('div')
    overlay.id = OVERLAY_ID
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-label', 'Mitumba Pay secure checkout')
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      border: '0',
      // A scrim over the store page: the page stays visible behind it, dimmed and softly blurred.
      background: 'rgba(16, 24, 18, 0.45)',
      backdropFilter: 'blur(6px)',
      opacity: reduceMotion ? '1' : '0',
      transition: reduceMotion ? '' : 'opacity 180ms ease-out',
    } satisfies Partial<CSSStyleDeclaration>)
    // Safari before 18 only knows the prefixed property.
    overlay.style.setProperty('-webkit-backdrop-filter', 'blur(6px)')

    const iframe = document.createElement('iframe')
    const src = new URL(widgetUrl)
    src.searchParams.set('session', options.sessionId)
    src.searchParams.set('parent_origin', parentOrigin)
    iframe.src = src.toString()
    iframe.title = 'Mitumba Pay'
    iframe.allow = 'payment'
    Object.assign(iframe.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      border: '0',
      background: 'transparent',
      // Match the widget's light scheme. A frame whose scheme differs from its document's is painted
      // opaque by the browser, which would hide the store page on a dark-scheme site.
      colorScheme: 'light',
    } satisfies Partial<CSSStyleDeclaration>)

    overlay.appendChild(iframe)
    document.body.appendChild(overlay)
    if (!reduceMotion) requestAnimationFrame(() => { overlay.style.opacity = '1' })

    let settled = false

    const cleanup = () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('keydown', onKeyDown)
      clearTimeout(timer)
      overlay.remove()
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }

    const settle = (result: MitumbaPayResult) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(result)
    }

    const post = (type: string, payload?: unknown) => {
      iframe.contentWindow?.postMessage({ type, version: BRIDGE_VERSION_V2, payload }, widgetOrigin)
    }

    const onMessage = (event: MessageEvent<unknown>) => {
      // Exact origin and source checks: only trust the widget window we created.
      if (event.origin !== widgetOrigin) return
      if (event.source !== iframe.contentWindow) return

      const data = event.data as Partial<BridgeMessage>
      if (!data || typeof data !== 'object' || data.version !== BRIDGE_VERSION_V2) return

      switch (data.type) {
        case MITUMBA_PAY_MESSAGE.ready:
          // INIT carries only the session id + client secret.
          post(MITUMBA_PAY_MESSAGE.init, {
            session_id: options.sessionId,
            client_secret: options.clientSecret,
          })
          break
        case MITUMBA_PAY_MESSAGE.status:
          if (isBridgeMessage(data, MITUMBA_PAY_MESSAGE.status)) options.onStatus?.(data.payload)
          break
        case MITUMBA_PAY_MESSAGE.complete:
          settle({ outcome: 'complete', status: data.payload ?? null })
          break
        case MITUMBA_PAY_MESSAGE.close:
          settle({ outcome: 'closed', status: null })
          break
        case MITUMBA_PAY_MESSAGE.updateRequired:
          settle({ outcome: 'update_required', status: null })
          break
        default:
          break
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') settle({ outcome: 'closed', status: null })
    }

    window.addEventListener('message', onMessage)
    window.addEventListener('keydown', onKeyDown)
    const timer = setTimeout(() => settle({ outcome: 'timeout', status: null }), timeoutMs)

    iframe.focus()
  })
}
