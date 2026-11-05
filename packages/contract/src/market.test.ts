import { describe, it, expect } from 'vitest'
import { marketSchema, marketsResponseSchema, paymentMethodTypeSchema } from './market'
import { PAY_CONTRACT_VERSION } from './version'

const kenya = {
  code: 'KE',
  name: 'Kenya',
  status: 'active' as const,
  currency: { code: 'KES', minor_unit: 2, symbol: 'KSh', locale: 'en-KE' },
  calling_code: '+254',
  supported_methods: ['mobile_money', 'card'],
}

describe('market schema', () => {
  it('accepts a well-formed active market', () => {
    const parsed = marketSchema.parse(kenya)
    expect(parsed.code).toBe('KE')
    expect(parsed.currency.code).toBe('KES')
  })

  it('accepts an unknown-but-well-formed method in supported_methods (open)', () => {
    const parsed = marketSchema.parse({ ...kenya, supported_methods: ['airtel_money'] })
    expect(parsed.supported_methods).toEqual(['airtel_money'])
  })

  it('accepts a coming_soon market', () => {
    expect(marketSchema.parse({ ...kenya, status: 'coming_soon' }).status).toBe('coming_soon')
  })

  it('rejects a non alpha-2 market code', () => {
    expect(() => marketSchema.parse({ ...kenya, code: 'KEN' })).toThrow()
  })

  it('rejects a malformed calling code', () => {
    expect(() => marketSchema.parse({ ...kenya, calling_code: '254' })).toThrow()
  })

  it('parses a markets discovery response', () => {
    const parsed = marketsResponseSchema.parse({
      version: PAY_CONTRACT_VERSION,
      markets: [kenya],
      updated_at: '2026-01-01T00:00:00Z',
    })
    expect(parsed.markets).toHaveLength(1)
  })

  it('accepts any non-empty method type', () => {
    expect(paymentMethodTypeSchema.parse('bank_transfer')).toBe('bank_transfer')
    expect(() => paymentMethodTypeSchema.parse('')).toThrow()
  })
})
