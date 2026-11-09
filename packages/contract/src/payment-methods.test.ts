import { describe, it, expect } from 'vitest'
import {
  savedPaymentMethodsResponseSchema,
  savePaymentMethodInputSchema,
  savedPaymentMethodEnvelopeSchema,
  PAY_CONTRACT_VERSION,
} from './index'

const method = {
  id: 'pm_1',
  market_code: 'UG',
  method: { type: 'mobile_money', phone: '+256772123456' },
  label: 'Mobile money',
  is_default: true,
  created_at: '2026-11-09T10:00:00Z',
}

describe('saved payment methods contract', () => {
  it('parses a list for any market', () => {
    const parsed = savedPaymentMethodsResponseSchema.parse({ version: PAY_CONTRACT_VERSION, market_code: 'UG', data: [method] })
    expect(parsed.data[0]?.method.phone).toBe('+256772123456')
    expect(savedPaymentMethodEnvelopeSchema.parse({ data: method }).data.id).toBe('pm_1')
  })

  it('rejects a saved method that is not mobile money or not E.164', () => {
    expect(() => savedPaymentMethodEnvelopeSchema.parse({ data: { ...method, method: { type: 'card' } } })).toThrow()
    expect(() => savedPaymentMethodEnvelopeSchema.parse({ data: { ...method, method: { type: 'mobile_money', phone: '0772123456' } } })).toThrow()
    expect(() => savedPaymentMethodEnvelopeSchema.parse({ data: { ...method, market_code: 'ug' } })).toThrow()
  })

  it('accepts a local-form phone on save, trimmed, and bounds the label', () => {
    expect(
      savePaymentMethodInputSchema.parse({ market_code: 'KE', method: { type: 'mobile_money', phone: ' 0712 345 678 ' }, label: ' Work ' }),
    ).toEqual({ market_code: 'KE', method: { type: 'mobile_money', phone: '0712 345 678' }, label: 'Work' })
    expect(() => savePaymentMethodInputSchema.parse({ market_code: 'KE', method: { type: 'card' } })).toThrow()
    expect(() =>
      savePaymentMethodInputSchema.parse({ market_code: 'KE', method: { type: 'mobile_money', phone: '0712345678' }, label: '' }),
    ).toThrow()
  })
})
