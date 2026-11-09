import { describe, it, expect } from 'vitest'
import { unavailableMessage } from './unavailable'

describe('unavailableMessage', () => {
  it('says nothing was charged and when to retry', () => {
    expect(unavailableMessage(null)).toBe('Payments are temporarily unavailable. Nothing was charged. Please try again shortly.')
    expect(unavailableMessage(45 * 60_000)).toBe(
      'Payments are temporarily unavailable. Nothing was charged. Please try again in about 45 minutes.',
    )
    expect(unavailableMessage(2 * 60 * 60_000)).toBe(
      'Payments are temporarily unavailable. Nothing was charged. Please try again in about 2 hours.',
    )
  })
})