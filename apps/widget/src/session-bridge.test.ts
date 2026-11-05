import { describe, it, expect, vi, afterEach } from 'vitest'
import { onInit } from './session-bridge'
import { BRIDGE_VERSION_V2, MITUMBA_PAY_MESSAGE } from '@mitumba/pay-react'

const PARENT = 'https://marketplace.example'

function initEvent(origin: string, source: unknown, payload: unknown) {
  const event = new MessageEvent('message', {
    data: { type: MITUMBA_PAY_MESSAGE.init, version: BRIDGE_VERSION_V2, payload },
  })
  Object.defineProperty(event, 'origin', { value: origin })
  Object.defineProperty(event, 'source', { value: source })
  return event
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('onInit', () => {
  it('surfaces session id + secret from a valid INIT from the parent origin', () => {
    const handler = vi.fn()
    const off = onInit(PARENT, handler)
    window.dispatchEvent(initEvent(PARENT, window.parent, { session_id: 'cs_1', client_secret: 'csec_1' }))
    expect(handler).toHaveBeenCalledWith({ session_id: 'cs_1', client_secret: 'csec_1' })
    off()
  })

  it('ignores INIT from a foreign origin', () => {
    const handler = vi.fn()
    const off = onInit(PARENT, handler)
    window.dispatchEvent(initEvent('https://evil.example', window.parent, { session_id: 'cs_1', client_secret: 'csec_1' }))
    expect(handler).not.toHaveBeenCalled()
    off()
  })

  it('ignores INIT from a non-parent source', () => {
    const handler = vi.fn()
    const off = onInit(PARENT, handler)
    window.dispatchEvent(initEvent(PARENT, {}, { session_id: 'cs_1', client_secret: 'csec_1' }))
    expect(handler).not.toHaveBeenCalled()
    off()
  })

  it('ignores INIT with a missing client secret', () => {
    const handler = vi.fn()
    const off = onInit(PARENT, handler)
    window.dispatchEvent(initEvent(PARENT, window.parent, { session_id: 'cs_1' }))
    expect(handler).not.toHaveBeenCalled()
    off()
  })

  it('does nothing when parentOrigin is null', () => {
    const handler = vi.fn()
    const off = onInit(null, handler)
    window.dispatchEvent(initEvent(PARENT, window.parent, { session_id: 'cs_1', client_secret: 'csec_1' }))
    expect(handler).not.toHaveBeenCalled()
    off()
  })
})
