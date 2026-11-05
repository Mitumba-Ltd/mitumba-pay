import { describe, it, expect } from 'vitest'
import { formatMoney } from './formatMoney'

// Intl inserts a non-breaking space (U+00A0) between the currency code and the
// amount; normalize all whitespace so assertions aren't ICU-version-sensitive.
const norm = (s: string) => s.replace(/\s+/g, ' ')

describe('formatMoney', () => {
  it('formats KES with two minor-unit digits', () => {
    const out = norm(formatMoney({ currency: 'KES', minor_units: 125000 }, 'en-KE'))
    expect(out).toMatch(/1,250/)
    expect(out).toMatch(/KES|KSh|Ksh/)
  })

  it('formats a zero amount', () => {
    expect(norm(formatMoney({ currency: 'KES', minor_units: 0 }, 'en-KE'))).toMatch(/0/)
  })

  it('renders an unknown currency as CODE 1,234.56', () => {
    const out = norm(formatMoney({ currency: 'ZZZ', minor_units: 123456 }, undefined))
    expect(out).toBe('ZZZ 1,234.56')
  })

  it('honors a zero-decimal currency via minorUnitDigits', () => {
    const out = norm(formatMoney({ currency: 'ZZZ', minor_units: 5000 }, undefined, 0))
    expect(out).toBe('ZZZ 5,000')
  })
})
