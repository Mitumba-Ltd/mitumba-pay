import { describe, expect, it } from 'vitest'
import { BRIDGE_VERSION, MESSAGE, isInitMessage, postToParent } from './bridge'

describe('hosted widget bridge', () => {
  it('accepts a complete versioned initialization message', () => {
    expect(isInitMessage({
      type: MESSAGE.init,
      version: BRIDGE_VERSION,
      payload: {
        orderId: 'ord_123',
        token: 'runtime-token',
        amountLabel: 'KES 1,250.00',
      },
    })).toBe(true)
  })

  it('rejects missing credentials and incompatible versions', () => {
    expect(isInitMessage({
      type: MESSAGE.init,
      version: BRIDGE_VERSION,
      payload: { orderId: 'ord_123', amountLabel: 'KES 1,250.00' },
    })).toBe(false)

    expect(isInitMessage({
      type: MESSAGE.init,
      version: 2,
      payload: { orderId: 'ord_123', token: 'token', amountLabel: 'KES 1,250.00' },
    })).toBe(false)
  })

  it('does not broadcast messages when no trusted parent origin is known', () => {
    expect(postToParent(null, MESSAGE.ready)).toBe(false)
  })
})
