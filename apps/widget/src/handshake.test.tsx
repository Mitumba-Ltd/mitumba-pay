import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { BRIDGE_VERSION_V2, MITUMBA_PAY_MESSAGE, type CheckoutSessionContext } from '@mitumba/pay-react'
import { App } from './App'
import { SessionApp, INIT_TIMEOUT_MS } from './SessionApp'
import { context } from './test-fixtures'

const PARENT = 'https://marketplace.example'

let root: Root
let container: HTMLDivElement
let parent: { postMessage: ReturnType<typeof vi.fn> }
let fetchMock: ReturnType<typeof vi.fn>

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function sent() {
  return parent.postMessage.mock.calls.map(([message]) => message as { type: string; version: number })
}

function initFromParent(payload: unknown) {
  const event = new MessageEvent('message', {
    data: { type: MITUMBA_PAY_MESSAGE.init, version: BRIDGE_VERSION_V2, payload },
  })
  Object.defineProperty(event, 'origin', { value: PARENT })
  Object.defineProperty(event, 'source', { value: window.parent })
  window.dispatchEvent(event)
}

function render(node: React.ReactNode) {
  act(() => root.render(node))
}

function buttonLabelled(label: string): HTMLButtonElement {
  const button = [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label)
  if (!button) throw new Error(`no button labelled ${label}`)
  return button
}

/** Serve one session context; let the microtasks that parse it run. */
async function serveContext(ctx: CheckoutSessionContext) {
  fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify(ctx), { status: 200, headers: { 'Content-Type': 'application/json' } })))
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve()
  })
}



beforeEach(() => {
  vi.useFakeTimers()
  fetchMock = vi.fn(() => new Promise(() => {}))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('isSecureContext', true)
  parent = { postMessage: vi.fn() }
  Object.defineProperty(window, 'parent', { value: parent, configurable: true })
  Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
  // jsdom serves the page from http://localhost, which the connection check allows for development.
  window.history.replaceState(null, '', `/widget/?parent_origin=${encodeURIComponent(PARENT)}`)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  Object.defineProperty(window, 'parent', { value: window, configurable: true })
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('hosted widget handshake', () => {
  it('announces READY in both bridge versions when opened without ?session=', () => {
    render(<App />)
    const readies = sent().filter((m) => m.type === MITUMBA_PAY_MESSAGE.ready)
    expect(readies.map((m) => m.version).sort()).toEqual([1, BRIDGE_VERSION_V2].sort())
  })

  it('checks silently, then waits on the order after a V2 INIT', () => {
    render(<App />)
    expect(container.querySelector('[aria-label="Loading secure checkout"]')).not.toBeNull()
    act(() => initFromParent({ session_id: 'cs_1', client_secret: 'csec_1' }))
    // No checklist and no checkout card until the session is verified.
    expect(container.querySelector('.mpay-checkout')).toBeNull()
    expect(container.querySelectorAll('li')).toHaveLength(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/pay/checkout-sessions/cs_1')
  })

  it('closes a V2 parent from a refusal', () => {
    render(<App />)
    act(() => vi.advanceTimersByTime(INIT_TIMEOUT_MS))
    act(() => buttonLabelled('Close').click())
    expect(sent()).toContainEqual(expect.objectContaining({ type: MITUMBA_PAY_MESSAGE.close, version: BRIDGE_VERSION_V2 }))
  })

  it('tells the buyer when the parent never sends INIT', () => {
    render(<App />)
    act(() => vi.advanceTimersByTime(INIT_TIMEOUT_MS))
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("couldn't start secure checkout")
  })

  it('session app times out with a working Close too', () => {
    render(<SessionApp />)
    act(() => vi.advanceTimersByTime(INIT_TIMEOUT_MS))
    expect(container.querySelector('[role="alert"]')).not.toBeNull()
    act(() => buttonLabelled('Close').click())
    expect(sent()).toContainEqual(expect.objectContaining({ type: MITUMBA_PAY_MESSAGE.close, version: BRIDGE_VERSION_V2 }))
  })
})

describe('secure overlay', () => {
  it('renders the hosted checkout only after every check passes', async () => {
    await serveContext(context({ parent_origin: PARENT }))
    render(<SessionApp initialCreds={{ sessionId: 'cs_1', clientSecret: 'csec_1' }} />)
    expect(container.querySelector('.mpay-checkout')).toBeNull()
    await flush()
    expect(container.querySelector('[aria-label="Loading secure checkout"]')).toBeNull()
    expect(container.querySelector('.mpay-checkout')).not.toBeNull()
    expect(container.textContent).toContain('Payment methods')
    expect(container.textContent).toContain('M-Pesa')
    expect(container.textContent).toContain('KES 6,150.00')
    expect(container.textContent).toContain('KES 300.00')
    expect(container.textContent).toContain('CHK-1')
    expect(container.textContent).toContain('Funds held securely until delivery')
    expect(sent().some((m) => m.type === MITUMBA_PAY_MESSAGE.ready)).toBe(false)
  })

  it('sends the session method with the chosen network', async () => {
    await serveContext(context({ parent_origin: PARENT }))
    render(<SessionApp initialCreds={{ sessionId: 'cs_1', clientSecret: 'csec_1' }} />)
    await flush()
    const input = container.querySelector('input[inputmode="tel"]') as HTMLInputElement
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, '0712345678')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    fetchMock.mockImplementation(() => new Promise(() => {}))
    act(() => container.querySelector<HTMLButtonElement>('.mpay-primary')!.click())
    const [url, init] = fetchMock.mock.calls.at(-1)!
    expect(String(url)).toContain('/pay/checkout-sessions/cs_1/attempts')
    expect(JSON.parse((init as RequestInit).body as string).method).toEqual({ type: 'mobile_money', network: 'mpesa', phone: '+254712345678' })
  })

  it('refuses a session bound to another store', async () => {
    await serveContext(context({ parent_origin: 'https://other.example' }))
    render(<SessionApp initialCreds={{ sessionId: 'cs_1', clientSecret: 'csec_1' }} />)
    await flush()
    expect(container.querySelector('.mpay-checkout')).toBeNull()
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/different store/)
  })

  it('refuses an expired session', async () => {
    await serveContext(context({ parent_origin: PARENT, session_status: 'expired' }))
    render(<SessionApp initialCreds={{ sessionId: 'cs_1', clientSecret: 'csec_1' }} />)
    await flush()
    expect(container.querySelector('.mpay-checkout')).toBeNull()
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/expired/)
  })

  it('refuses before announcing itself in a frame too small to see', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 1, configurable: true })
    render(<SessionApp />)
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/too small/)
    expect(sent().some((m) => m.type === MITUMBA_PAY_MESSAGE.ready)).toBe(false)
  })

  it('dismisses on a tap outside the checkout', async () => {
    await serveContext(context({ parent_origin: PARENT }))
    render(<SessionApp initialCreds={{ sessionId: 'cs_1', clientSecret: 'csec_1' }} />)
    await flush()
    const overlay = container.querySelector('.pay-overlay')!
    act(() => overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })))
    expect(sent()).toContainEqual(expect.objectContaining({ type: MITUMBA_PAY_MESSAGE.close }))
  })
})
