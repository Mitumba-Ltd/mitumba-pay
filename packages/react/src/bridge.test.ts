import { describe, it, expect } from 'vitest'
import {
  BRIDGE_VERSION_V2,
  MITUMBA_PAY_MESSAGE,
  isBridgeMessage,
  isBridgeInitMessage,
} from './bridge'

describe('bridge v2 guards', () => {
  it('accepts a well-formed INIT message', () => {
    expect(
      isBridgeInitMessage({
        type: MITUMBA_PAY_MESSAGE.init,
        version: BRIDGE_VERSION_V2,
        payload: { session_id: 'cs_1', client_secret: 'csec_1' },
      }),
    ).toBe(true)
  })

  it('rejects INIT with a missing client secret', () => {
    expect(
      isBridgeInitMessage({
        type: MITUMBA_PAY_MESSAGE.init,
        version: BRIDGE_VERSION_V2,
        payload: { session_id: 'cs_1' },
      }),
    ).toBe(false)
  })

  it('rejects INIT carrying a legacy amount/token (V2 passes only id + secret)', () => {
    // Even if extra fields are present, the guard only trusts session_id + secret.
    const msg = {
      type: MITUMBA_PAY_MESSAGE.init,
      version: BRIDGE_VERSION_V2,
      payload: { session_id: 'cs_1', client_secret: 'csec_1', amountLabel: 'KES 6,000', token: 'x' },
    }
    expect(isBridgeInitMessage(msg)).toBe(true)
    // The launcher/widget never read amountLabel/token off the payload; only the
    // two trusted fields are typed, so extra keys are inert.
  })

  it('rejects a wrong version', () => {
    expect(
      isBridgeInitMessage({
        type: MITUMBA_PAY_MESSAGE.init,
        version: 1,
        payload: { session_id: 'cs_1', client_secret: 'csec_1' },
      }),
    ).toBe(false)
  })

  it('rejects a mismatched type', () => {
    expect(isBridgeMessage({ type: MITUMBA_PAY_MESSAGE.close, version: BRIDGE_VERSION_V2 }, MITUMBA_PAY_MESSAGE.status)).toBe(false)
    expect(isBridgeMessage({ type: MITUMBA_PAY_MESSAGE.close, version: BRIDGE_VERSION_V2 }, MITUMBA_PAY_MESSAGE.close)).toBe(true)
  })

  it('rejects non-object values', () => {
    expect(isBridgeInitMessage(null)).toBe(false)
    expect(isBridgeInitMessage('MITUMBA_PAY_INIT')).toBe(false)
  })
})
