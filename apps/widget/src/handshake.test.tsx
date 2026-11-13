import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { BRIDGE_VERSION_V2, MITUMBA_PAY_MESSAGE } from '@mitumba/pay-react'
import { App } from './App'
import { SessionApp, INIT_TIMEOUT_MS } from './SessionApp'

const PARENT = 'https://marketplace.example'

let root: Root
let container: HTMLDivElement
let parent: { postMessage: ReturnType<typeof vi.fn> }

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
  const button = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(label))
  if (!button) throw new Error(`no button labelled ${label}`)
  return button
}

beforeEach(() => {
  vi.useFakeTimers()
  // Never resolve network calls: these tests cover the handshake, not the checkout itself.
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  parent = { postMessage: vi.fn() }
  Object.defineProperty(window, 'parent', { value: parent, configurable: true })
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

  it('hands a Bridge V2 INIT over to the session checkout', () => {
    render(<App />)
    act(() => initFromParent({ session_id: 'cs_1', client_secret: 'csec_1' }))
    expect(container.textContent).toContain('AMOUNT DUE')
    expect(container.textContent).not.toContain('Preparing secure checkout')
  })

  it('closes a V2 parent from the waiting card', () => {
    render(<App />)
    act(() => buttonLabelled('Close').click())
    expect(sent()).toContainEqual(expect.objectContaining({ type: MITUMBA_PAY_MESSAGE.close, version: BRIDGE_VERSION_V2 }))
  })

  it('tells the buyer when the parent never sends INIT', () => {
    render(<App />)
    expect(container.textContent).toContain('Preparing secure checkout')
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

  it('session app skips the wait when credentials are handed over', () => {
    render(<SessionApp initialCreds={{ sessionId: 'cs_1', clientSecret: 'csec_1' }} />)
    expect(container.textContent).toContain('AMOUNT DUE')
    expect(sent().some((m) => m.type === MITUMBA_PAY_MESSAGE.ready)).toBe(false)
  })
})
