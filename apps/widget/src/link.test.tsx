import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { PayError } from '@mitumba/pay-react'
import { LINK_CLOSE_URL, LinkApp, linkRefusal, linkTokenFromPath } from './LinkApp'
import { context } from './test-fixtures'

const TOKEN = 'A'.repeat(43)

let root: Root
let container: HTMLDivElement
let fetchMock: ReturnType<typeof vi.fn>

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function render(node: React.ReactNode) {
  act(() => root.render(node))
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve()
  })
}

function redeeming(result: Promise<{ session_id: string; client_secret: string }>) {
  return { redeemPaymentLink: vi.fn(() => result) } as unknown as Parameters<typeof LinkApp>[0]['client'] & {
    redeemPaymentLink: ReturnType<typeof vi.fn>
  }
}

const session = { version: 1, session_id: 'cs_link', client_secret: 'csec_link', expires_at: '2026-01-01T00:15:00Z', hosted_url: 'x' }

beforeEach(() => {
  fetchMock = vi.fn(() => new Promise(() => {}))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('isSecureContext', true)
  Object.defineProperty(window, 'parent', { value: window, configurable: true })
  Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
  window.history.replaceState(null, '', `/i/${TOKEN}`)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  Object.defineProperty(window, 'parent', { value: window, configurable: true })
  vi.unstubAllGlobals()
})

describe('linkTokenFromPath', () => {
  it.each([
    [`/i/${TOKEN}`, TOKEN],
    [`/i/${TOKEN}/`, TOKEN],
    ['/i/ab-_9', 'ab-_9'],
  ])('reads %s', (path, token) => {
    expect(linkTokenFromPath(path)).toBe(token)
  })

  it.each(['/', '/widget/', '/i/', `/i/${TOKEN}/extra`, '/i/a.b', `/x/${TOKEN}`])('ignores %s', (path) => {
    expect(linkTokenFromPath(path)).toBeNull()
  })
})

describe('linkRefusal', () => {
  it('says an unknown or lapsed link expired or does not exist', () => {
    expect(linkRefusal(new PayError(404, { error: 'not_found' }))).toBe('This order either expired or doesn’t exist.')
  })

  it('says a paid order is already paid', () => {
    expect(linkRefusal(new PayError(409, { error: 'order_not_payable' }))).toBe('This order is already paid.')
  })

  it('asks to try again for anything else', () => {
    expect(linkRefusal(new PayError(0, { error: 'network_error' }))).toMatch(/Try the link again/)
    expect(linkRefusal(new Error('boom'))).toMatch(/Try the link again/)
  })
})

describe('a payment link page', () => {
  it('redeems the token, then shows the checkout bound to this page', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(context({ parent_origin: window.location.origin })), { status: 200, headers: { 'Content-Type': 'application/json' } })),
    )
    const client = redeeming(Promise.resolve(session))
    render(<LinkApp token={TOKEN} client={client} />)
    expect(container.querySelector('[aria-label="Loading secure checkout"]')).not.toBeNull()
    await flush()
    expect(client.redeemPaymentLink).toHaveBeenCalledWith(TOKEN)
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/pay/checkout-sessions/cs_link')
    expect(container.querySelector('.mpay-checkout')).not.toBeNull()
  })

  it('says an unknown or lapsed link expired or does not exist, and Close leaves the page', async () => {
    const onClose = vi.fn()
    render(<LinkApp token={TOKEN} client={redeeming(Promise.reject(new PayError(404, { error: 'not_found' })))} onClose={onClose} />)
    await flush()
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('This order either expired or doesn’t exist.')
    expect(container.querySelector('.mpay-checkout')).toBeNull()
    act(() => (container.querySelector('.pay-refusal-close') as HTMLButtonElement).click())
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('says a paid order is already paid', async () => {
    render(<LinkApp token={TOKEN} client={redeeming(Promise.reject(new PayError(409, { error: 'order_not_payable' })))} />)
    await flush()
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('This order is already paid.')
  })

  it('refuses to run inside a frame, and never redeems the token there', async () => {
    Object.defineProperty(window, 'parent', { value: { postMessage: vi.fn() }, configurable: true })
    const client = redeeming(Promise.resolve(session))
    render(<LinkApp token={TOKEN} client={client} />)
    await flush()
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Open this payment link in your browser.')
    expect(client.redeemPaymentLink).not.toHaveBeenCalled()
  })

  it('refuses an insecure connection before anything else', async () => {
    vi.stubGlobal('isSecureContext', false)
    const client = redeeming(Promise.resolve(session))
    render(<LinkApp token={TOKEN} client={client} />)
    await flush()
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('This payment window is not on a secure connection.')
    expect(client.redeemPaymentLink).not.toHaveBeenCalled()
  })

  it('ignores a redemption that settles after the page is gone', async () => {
    let resolve!: (value: typeof session) => void
    const client = redeeming(new Promise((r) => { resolve = r }))
    render(<LinkApp token={TOKEN} client={client} />)
    act(() => root.unmount())
    root = createRoot(container)
    resolve(session)
    await flush()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('closes to the buyer’s orders by default', async () => {
    const assign = vi.fn()
    Object.defineProperty(window, 'location', { value: { ...window.location, assign, origin: window.location.origin, pathname: window.location.pathname, search: '' }, configurable: true })
    render(<LinkApp token={TOKEN} client={redeeming(Promise.reject(new PayError(404, { error: 'not_found' })))} />)
    await flush()
    act(() => (container.querySelector('.pay-refusal-close') as HTMLButtonElement).click())
    expect(assign).toHaveBeenCalledWith(LINK_CLOSE_URL)
  })
})
