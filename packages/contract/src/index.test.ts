import { describe, it, expect } from 'vitest'
import {
  initiateCheckoutInputSchema,
  initiateCheckoutResponseSchema,
  checkoutStatusResponseSchema,
  PAY_CONTRACT_VERSION,
  KENYAN_MSISDN,
} from './index'

describe('pay-contract schemas', () => {
  it('accepts a valid mobile_money initiate input', () => {
    const parsed = initiateCheckoutInputSchema.parse({
      order_id: 'ord_123',
      idempotency_key: 'idem_abc',
      method: { type: 'mobile_money', phone: '+254712345678' },
    })
    expect(parsed.method.type).toBe('mobile_money')
  })

  it('rejects a non-Kenyan phone number', () => {
    expect(() =>
      initiateCheckoutInputSchema.parse({
        order_id: 'ord_123',
        idempotency_key: 'idem_abc',
        method: { type: 'mobile_money', phone: '0712345678' },
      }),
    ).toThrow()
  })

  it('accepts a card initiate input with no extra fields', () => {
    const parsed = initiateCheckoutInputSchema.parse({
      order_id: 'ord_123',
      idempotency_key: 'idem_abc',
      method: { type: 'card' },
    })
    expect(parsed.method.type).toBe('card')
  })

  it('parses an await_confirmation initiate response', () => {
    const parsed = initiateCheckoutResponseSchema.parse({
      version: PAY_CONTRACT_VERSION,
      order_id: 'ord_123',
      attempt: { id: 'att_1', sequence: 1, provider: 'daraja', status: 'initiated' },
      next_action: { type: 'await_confirmation' },
    })
    expect(parsed.next_action.type).toBe('await_confirmation')
  })

  it('accepts an unknown provider id (open union)', () => {
    const parsed = initiateCheckoutResponseSchema.parse({
      version: PAY_CONTRACT_VERSION,
      order_id: 'ord_123',
      attempt: { id: 'att_1', sequence: 1, provider: 'mtn_momo', status: 'initiated' },
      next_action: { type: 'await_confirmation' },
    })
    expect(parsed.attempt.provider).toBe('mtn_momo')
  })

  it('parses a full checkout-status response', () => {
    const parsed = checkoutStatusResponseSchema.parse({
      version: PAY_CONTRACT_VERSION,
      order_id: 'ord_123',
      order: { type: 'retail', status: 'paid' },
      checkout_status: 'paid',
      terminal: true,
      retryable: false,
      amount: { currency: 'KES', minor_units: 125000 },
      latest_attempt: {
        id: 'att_1',
        sequence: 1,
        provider: 'daraja',
        status: 'funded',
        terminal: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:01:00Z',
      },
      attempt_count: 1,
      order_updated_at: '2026-01-01T00:01:00Z',
      status_updated_at: '2026-01-01T00:01:00Z',
      server_time: '2026-01-01T00:02:00Z',
      poll_after_ms: 2000,
    })
    expect(parsed.checkout_status).toBe('paid')
  })

  it('exposes the Kenyan MSISDN pattern', () => {
    expect(KENYAN_MSISDN.test('+254712345678')).toBe(true)
    expect(KENYAN_MSISDN.test('+1234567890')).toBe(false)
  })
})
