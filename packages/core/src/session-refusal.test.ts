import { describe, it, expect } from 'vitest'
import { formatMoneyCode, sessionRefusal, type CheckoutSessionContext } from './index'

function context(over: Partial<CheckoutSessionContext> = {}): CheckoutSessionContext {
  return {
    version: 1,
    session_id: 'cs_1',
    session_status: 'open',
    market: { code: 'KE', name: 'Kenya' },
    amount: { currency: 'KES', minor_units: 615000 },
    line_items: [],
    reference: 'CHK-1',
    available_methods: [
      { type: 'mobile_money', network: 'mpesa', display_name: 'M-Pesa', status: 'available', input_fields: [] },
    ],
    parent_origin: 'https://app.example',
    return_url: null,
    cancel_url: null,
    expires_at: '2026-11-13T18:00:00Z',
    server_time: '2026-11-13T17:00:00Z',
    saved_methods: [],
    ...over,
  }
}

const [mpesa] = context().available_methods

describe('sessionRefusal', () => {
  it('allows an open session before expiry with a payable method', () => expect(sessionRefusal(context())).toBeNull())
  it('allows a processing session', () => expect(sessionRefusal(context({ session_status: 'processing' }))).toBeNull())
  it('refuses a paid session', () => expect(sessionRefusal(context({ session_status: 'complete' }))?.code).toBe('already_paid'))
  it('refuses an expired session', () => expect(sessionRefusal(context({ session_status: 'expired' }))?.code).toBe('expired'))
  it('refuses a cancelled session', () => expect(sessionRefusal(context({ session_status: 'cancelled' }))?.code).toBe('cancelled'))
  it('refuses an open session past expiry by server time', () =>
    expect(sessionRefusal(context({ expires_at: '2026-11-13T17:00:00Z' }))?.code).toBe('expired'))
  it('ignores unparseable times rather than guessing', () =>
    expect(sessionRefusal(context({ expires_at: 'soon', server_time: 'now' }))).toBeNull())
  it('allows an available card', () =>
    expect(sessionRefusal(context({ available_methods: [{ type: 'card', display_name: 'Card', status: 'available', input_fields: [] }] }))).toBeNull())
  it('refuses when every method is unavailable', () =>
    expect(sessionRefusal(context({ available_methods: [{ ...mpesa!, status: 'temporarily_unavailable' }] }))?.code).toBe('no_payable_method'))
  it('refuses mobile money without a network', () =>
    expect(sessionRefusal(context({ available_methods: [{ ...mpesa!, network: undefined }] }))?.code).toBe('no_payable_method'))
  it('refuses when no method is offered', () =>
    expect(sessionRefusal(context({ available_methods: [] }))?.message).toMatch(/No payment method/))
})

describe('formatMoneyCode', () => {
  it('puts the code first with grouped digits', () =>
    expect(formatMoneyCode({ currency: 'KES', minor_units: 615000 })).toBe('KES 6,150.00'))
  it('uses the currency minor unit', () => expect(formatMoneyCode({ currency: 'UGX', minor_units: 25000 })).toBe('UGX 25,000'))
  it('keeps small amounts', () => expect(formatMoneyCode({ currency: 'KES', minor_units: 5 })).toBe('KES 0.05'))
  it('formats a negative amount', () => expect(formatMoneyCode({ currency: 'KES', minor_units: -123456 })).toBe('KES -1,234.56'))
  it('accepts explicit digits', () => expect(formatMoneyCode({ currency: 'KES', minor_units: 1000 }, 0)).toBe('KES 1,000'))
})
