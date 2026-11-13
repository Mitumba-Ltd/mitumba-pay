import { describe, it, expect, afterEach } from 'vitest'
import { openMitumbaPay, DEFAULT_HOSTED_WIDGET_URL } from './launcher'
import { BRIDGE_VERSION_V2, MITUMBA_PAY_MESSAGE } from './bridge'

const WIDGET_ORIGIN = new URL(DEFAULT_HOSTED_WIDGET_URL).origin

function getIframe(): HTMLIFrameElement {
  const overlay = document.getElementById('mitumba-pay-overlay')
  const iframe = overlay?.querySelector('iframe')
  if (!iframe) throw new Error('overlay iframe not mounted')
  return iframe as HTMLIFrameElement
}

/**
 * Dispatch a message as if it came from the widget iframe. The launcher checks
 * `event.source === iframe.contentWindow`, so we override `source` and `origin`
 * on a constructed event to match the created iframe.
 */
function messageFromWidget(iframe: HTMLIFrameElement, type: string, payload?: unknown) {
  const event = new MessageEvent('message', {
    data: { type, version: BRIDGE_VERSION_V2, payload },
  })
  Object.defineProperty(event, 'source', { value: iframe.contentWindow })
  Object.defineProperty(event, 'origin', { value: WIDGET_ORIGIN })
  window.dispatchEvent(event)
}

afterEach(() => {
  document.getElementById('mitumba-pay-overlay')?.remove()
  document.body.style.overflow = ''
})

describe('openMitumbaPay', () => {
  it('mounts a full-viewport overlay with session and parent_origin query params', () => {
    const promise = openMitumbaPay({ sessionId: 'cs_1', clientSecret: 'csec_1' })
    const iframe = getIframe()
    const src = new URL(iframe.src)
    expect(src.origin).toBe(WIDGET_ORIGIN)
    expect(src.searchParams.get('session')).toBe('cs_1')
    expect(src.searchParams.get('parent_origin')).toBe(window.location.origin)
    // The client secret is never placed in the URL.
    expect(iframe.src).not.toContain('csec_1')
    // Light scheme like the widget (a mismatched scheme makes the frame opaque) over a dimmed, blurred page.
    expect(iframe.style.colorScheme).toBe('light')
    expect(iframe.style.background).toBe('transparent')
    const overlay = document.getElementById('mitumba-pay-overlay')!
    expect(overlay.style.background).toContain('rgba(16, 24, 18, 0.45)')
    expect(document.body.style.overflow).toBe('hidden')
    // settle to avoid a dangling promise
    messageFromWidget(iframe, MITUMBA_PAY_MESSAGE.close)
    return promise
  })

  it('resolves complete and returns the COMPLETE payload', async () => {
    const promise = openMitumbaPay({ sessionId: 'cs_1', clientSecret: 'csec_1' })
    const iframe = getIframe()
    messageFromWidget(iframe, MITUMBA_PAY_MESSAGE.complete, { checkout_status: 'paid' })
    const result = await promise
    expect(result.outcome).toBe('complete')
    expect(result.status).toEqual({ checkout_status: 'paid' })
  })

  it('resolves closed on a CLOSE message and restores scroll', async () => {
    const promise = openMitumbaPay({ sessionId: 'cs_1', clientSecret: 'csec_1' })
    const iframe = getIframe()
    messageFromWidget(iframe, MITUMBA_PAY_MESSAGE.close)
    const result = await promise
    expect(result.outcome).toBe('closed')
    expect(document.getElementById('mitumba-pay-overlay')).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })

  it('resolves closed on Escape', async () => {
    const promise = openMitumbaPay({ sessionId: 'cs_1', clientSecret: 'csec_1' })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    const result = await promise
    expect(result.outcome).toBe('closed')
  })

  it('resolves update_required on an UPDATE_REQUIRED message', async () => {
    const promise = openMitumbaPay({ sessionId: 'cs_1', clientSecret: 'csec_1' })
    const iframe = getIframe()
    messageFromWidget(iframe, MITUMBA_PAY_MESSAGE.updateRequired)
    expect((await promise).outcome).toBe('update_required')
  })

  it('ignores messages from a foreign origin', async () => {
    const promise = openMitumbaPay({ sessionId: 'cs_1', clientSecret: 'csec_1' })
    const iframe = getIframe()
    const evil = new MessageEvent('message', {
      data: { type: MITUMBA_PAY_MESSAGE.complete, version: BRIDGE_VERSION_V2, payload: { hacked: true } },
    })
    Object.defineProperty(evil, 'source', { value: iframe.contentWindow })
    Object.defineProperty(evil, 'origin', { value: 'https://evil.example' })
    window.dispatchEvent(evil)
    // Still open — foreign origin was ignored.
    expect(document.getElementById('mitumba-pay-overlay')).not.toBeNull()
    messageFromWidget(iframe, MITUMBA_PAY_MESSAGE.close)
    expect((await promise).outcome).toBe('closed')
  })

  it('forwards STATUS payloads to onStatus', async () => {
    const seen: unknown[] = []
    const promise = openMitumbaPay({
      sessionId: 'cs_1',
      clientSecret: 'csec_1',
      onStatus: (p) => seen.push(p),
    })
    const iframe = getIframe()
    messageFromWidget(iframe, MITUMBA_PAY_MESSAGE.status, { phase: 'polling' })
    messageFromWidget(iframe, MITUMBA_PAY_MESSAGE.close)
    await promise
    expect(seen).toEqual([{ phase: 'polling' }])
  })

  it('refuses a second concurrent overlay', () => {
    const promise = openMitumbaPay({ sessionId: 'cs_1', clientSecret: 'csec_1' })
    expect(() => openMitumbaPay({ sessionId: 'cs_2', clientSecret: 'csec_2' })).toThrow()
    getIframe()
    messageFromWidget(getIframe(), MITUMBA_PAY_MESSAGE.close)
    return promise
  })
})
