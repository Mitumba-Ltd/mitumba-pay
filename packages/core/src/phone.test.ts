import { describe, it, expect } from 'vitest'
import { isValidPhone, nationalPart, normalizePhone, type PhoneFormat } from './index'

const KE: PhoneFormat = { callingCode: '+254', nationalLength: [9], example: '+254712345678' }
const UG: PhoneFormat = { callingCode: '+256', nationalLength: [9] }
const OPEN: PhoneFormat = { callingCode: '+234' }

describe('normalizePhone', () => {
  it.each([
    ['0712 345 678', '+254712345678'],
    ['712345678', '+254712345678'],
    ['254712345678', '+254712345678'],
    ['+254 712-345-678', '+254712345678'],
    ['  +254 0712 345 678 ', '+254712345678'],
    ['2540712345678', '+254712345678'],
  ])('reads %j as %s for KE', (input, expected) => {
    expect(normalizePhone(input, KE)).toBe(expected)
  })

  it('follows the market it is given, not a hardcoded country', () => {
    expect(normalizePhone('0772 123 456', UG)).toBe('+256772123456')
    expect(normalizePhone('+254712345678', UG)).toBeNull()
  })

  it.each([[''], ['   '], ['abc'], ['07123'], ['07123456789'], ['+2547123'], ['+254 00712345678'], ['0012345678']])(
    'rejects %j for KE',
    (input) => {
      expect(normalizePhone(input, KE)).toBeNull()
    },
  )

  it('without national lengths, accepts any E.164-length number for the calling code', () => {
    expect(normalizePhone('08012345678', OPEN)).toBe('+2348012345678')
    expect(normalizePhone('+234 801 234 5678', OPEN)).toBe('+2348012345678')
    expect(normalizePhone('080', OPEN)).toBeNull()
    expect(normalizePhone('+234' + '1'.repeat(13), OPEN)).toBeNull()
  })

  it('returns null when the calling code is unusable', () => {
    expect(normalizePhone('0712345678', { callingCode: '' })).toBeNull()
  })
})

describe('isValidPhone and nationalPart', () => {
  it('validates through normalizePhone', () => {
    expect(isValidPhone('0712345678', KE)).toBe(true)
    expect(isValidPhone('0712', KE)).toBe(false)
  })

  it('strips the calling code for a fixed-prefix input, and leaves other values alone', () => {
    expect(nationalPart('+254712345678', KE)).toBe('712345678')
    expect(nationalPart('0712', KE)).toBe('0712')
    expect(nationalPart('+254712345678', { callingCode: '' })).toBe('+254712345678')
  })
})
