import { describe, it, expect } from 'vitest'
import { moneySchema, currencyCodeSchema, minorUnitsSchema } from './money'

describe('money schema', () => {
  it('accepts a valid amount with an ISO 4217 currency', () => {
    const parsed = moneySchema.parse({ currency: 'KES', minor_units: 125000 })
    expect(parsed.currency).toBe('KES')
    expect(parsed.minor_units).toBe(125000)
  })

  it('accepts an unknown-but-well-formed currency (open, not a closed enum)', () => {
    expect(moneySchema.parse({ currency: 'NGN', minor_units: 0 }).currency).toBe('NGN')
  })

  it('accepts a zero amount', () => {
    expect(moneySchema.parse({ currency: 'KES', minor_units: 0 }).minor_units).toBe(0)
  })

  it('rejects a lowercase or malformed currency code', () => {
    expect(() => currencyCodeSchema.parse('kes')).toThrow()
    expect(() => currencyCodeSchema.parse('KESH')).toThrow()
    expect(() => currencyCodeSchema.parse('K')).toThrow()
  })

  it('rejects a negative amount', () => {
    expect(() => minorUnitsSchema.parse(-1)).toThrow()
  })

  it('rejects a fractional amount', () => {
    expect(() => minorUnitsSchema.parse(1250.5)).toThrow()
  })

  it('rejects an amount beyond Number.MAX_SAFE_INTEGER', () => {
    expect(() => minorUnitsSchema.parse(Number.MAX_SAFE_INTEGER + 2)).toThrow()
  })
})
