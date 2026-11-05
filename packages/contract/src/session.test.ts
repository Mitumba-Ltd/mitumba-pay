import { describe, it, expect } from 'vitest'
import {
  createCheckoutSessionInputSchema,
  createCheckoutSessionResponseSchema,
  checkoutSessionContextSchema,
  createAttemptInputSchema,
  sessionPaymentMethodSchema,
  checkoutSessionStatusResponseSchema,
  E164_PHONE,
} from './session'
import { PAY_CONTRACT_VERSION } from './version'

describe('checkout session creation', () => {
  it('accepts an order-sourced creation input', () => {
    const parsed = createCheckoutSessionInputSchema.parse({
      source: { type: 'order', id: 'ord_123' },
      parent_origin: 'https://marketplace.example',
      return_url: 'https://marketplace.example/orders/ord_123',
      cancel_url: 'https://marketplace.example/cart',
    })
    expect(parsed.source.id).toBe('ord_123')
  })

  it('accepts creation input with no return/cancel urls', () => {
    const parsed = createCheckoutSessionInputSchema.parse({
      source: { type: 'order', id: 'ord_123' },
      parent_origin: 'https://marketplace.example',
    })
    expect(parsed.return_url).toBeUndefined()
  })

  it('rejects a non-url parent origin', () => {
    expect(() =>
      createCheckoutSessionInputSchema.parse({
        source: { type: 'order', id: 'ord_123' },
        parent_origin: 'marketplace.example',
      }),
    ).toThrow()
  })

  it('parses a creation response', () => {
    const parsed = createCheckoutSessionResponseSchema.parse({
      version: PAY_CONTRACT_VERSION,
      session_id: 'cs_123',
      client_secret: 'csec_abc',
      expires_at: '2026-01-01T00:15:00Z',
      hosted_url: 'https://pay.mitumba.africa/widget?session=cs_123',
    })
    expect(parsed.session_id).toBe('cs_123')
  })
})

describe('checkout session context', () => {
  const base = {
    version: PAY_CONTRACT_VERSION,
    session_id: 'cs_123',
    session_status: 'open' as const,
    market: { code: 'KE', name: 'Kenya' },
    amount: { currency: 'KES', minor_units: 125000 },
    line_items: [{ label: 'Vintage Denim Jacket', amount: { currency: 'KES', minor_units: 125000 } }],
    reference: 'ord_123',
    available_methods: [
      {
        type: 'mobile_money',
        display_name: 'M-Pesa',
        status: 'available' as const,
        input_fields: [
          { name: 'phone', type: 'tel' as const, required: true, label: 'Phone', calling_code: '+254' },
        ],
      },
    ],
    parent_origin: 'https://marketplace.example',
    return_url: null,
    cancel_url: null,
    expires_at: '2026-01-01T00:15:00Z',
    server_time: '2026-01-01T00:00:00Z',
  }

  it('parses a full context', () => {
    const parsed = checkoutSessionContextSchema.parse(base)
    expect(parsed.available_methods[0]?.type).toBe('mobile_money')
    expect(parsed.amount.currency).toBe('KES')
  })

  it('accepts an unknown method type in available_methods (open, server-authored)', () => {
    const parsed = checkoutSessionContextSchema.parse({
      ...base,
      available_methods: [
        { type: 'airtel_money', display_name: 'Airtel Money', status: 'available', input_fields: [] },
      ],
    })
    expect(parsed.available_methods[0]?.type).toBe('airtel_money')
  })

  it('rejects a negative amount', () => {
    expect(() =>
      checkoutSessionContextSchema.parse({ ...base, amount: { currency: 'KES', minor_units: -1 } }),
    ).toThrow()
  })
})

describe('session attempt initiation', () => {
  it('accepts a mobile_money attempt with a generic E.164 phone', () => {
    const parsed = createAttemptInputSchema.parse({
      idempotency_key: 'intent_1',
      method: { type: 'mobile_money', phone: '+254712345678' },
    })
    expect(parsed.method.type).toBe('mobile_money')
  })

  it('accepts a non-Kenyan E.164 number (session is not country-locked)', () => {
    const parsed = createAttemptInputSchema.parse({
      idempotency_key: 'intent_1',
      method: { type: 'mobile_money', phone: '+2348012345678' },
    })
    expect(parsed.method).toEqual({ type: 'mobile_money', phone: '+2348012345678' })
  })

  it('accepts a card attempt with no fields', () => {
    expect(
      createAttemptInputSchema.parse({ idempotency_key: 'intent_1', method: { type: 'card' } })
        .method.type,
    ).toBe('card')
  })

  it('rejects a phone without a leading +', () => {
    expect(() => sessionPaymentMethodSchema.parse({ type: 'mobile_money', phone: '254712345678' })).toThrow()
  })

  it('exposes a generic E.164 pattern', () => {
    expect(E164_PHONE.test('+254712345678')).toBe(true)
    expect(E164_PHONE.test('0712345678')).toBe(false)
  })
})

describe('session status', () => {
  const base = {
    version: PAY_CONTRACT_VERSION,
    session_id: 'cs_123',
    session_status: 'open' as const,
    checkout_status: 'pending' as const,
    terminal: false,
    retryable: false,
    latest_attempt: {
      id: 'att_1',
      sequence: 1,
      provider: 'daraja',
      status: 'initiated' as const,
      terminal: false,
      next_action: { type: 'await_confirmation' as const },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    server_time: '2026-01-01T00:00:05Z',
    poll_after_ms: 2000,
  }

  it('parses a pending status with an in-flight attempt', () => {
    const parsed = checkoutSessionStatusResponseSchema.parse(base)
    expect(parsed.checkout_status).toBe('pending')
    expect(parsed.latest_attempt?.next_action?.type).toBe('await_confirmation')
  })

  it('parses a terminal paid status with a null next_action', () => {
    const parsed = checkoutSessionStatusResponseSchema.parse({
      ...base,
      session_status: 'complete',
      checkout_status: 'paid',
      terminal: true,
      latest_attempt: { ...base.latest_attempt, status: 'funded', terminal: true, next_action: null },
    })
    expect(parsed.terminal).toBe(true)
  })

  it('parses a status with no attempt yet', () => {
    expect(checkoutSessionStatusResponseSchema.parse({ ...base, latest_attempt: null }).latest_attempt).toBeNull()
  })

  it('rejects a negative poll_after_ms', () => {
    expect(() => checkoutSessionStatusResponseSchema.parse({ ...base, poll_after_ms: -1 })).toThrow()
  })
})
