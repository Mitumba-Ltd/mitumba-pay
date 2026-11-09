import { describe, it, expect } from 'vitest'
import { currencyDigits, formatMoney } from './index'

// Intl output varies by runtime (narrow vs regular space, symbol vs code); compare the digits.
const digitsOnly = (value: string) => value.replace(/[^\d.,]/g, '')

describe('currencyDigits', () => {
  it('reads the minor unit from ISO 4217 data', () => {
    expect(currencyDigits('KES')).toBe(2)
    expect(currencyDigits('UGX')).toBe(0)
    expect(currencyDigits('KWD')).toBe(3)
  })

  it('falls back to 2 for a code Intl rejects', () => {
    expect(currencyDigits('not-a-code')).toBe(2)
  })
})

describe('formatMoney', () => {
  it('divides by the currency minor unit, not always by 100', () => {
    expect(digitsOnly(formatMoney({ currency: 'KES', minor_units: 125000 }, 'en-KE'))).toBe('1,250.00')
    expect(digitsOnly(formatMoney({ currency: 'UGX', minor_units: 45000 }, 'en-UG'))).toBe('45,000')
  })

  it('honours explicit digits', () => {
    expect(digitsOnly(formatMoney({ currency: 'KES', minor_units: 125000 }, 'en-KE', 2))).toBe('1,250.00')
  })

  it('falls back to CODE amount when Intl rejects the currency', () => {
    expect(formatMoney({ currency: 'ZZZZ', minor_units: 1234567 }, 'en')).toBe('ZZZZ 12,345.67')
    expect(formatMoney({ currency: 'ZZZZ', minor_units: 1234567 }, 'en', 0)).toBe('ZZZZ 1,234,567')
  })
})
