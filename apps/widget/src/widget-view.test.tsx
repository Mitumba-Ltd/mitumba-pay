import { describe, it, expect } from 'vitest'
import { widgetView } from './SessionApp'
import { context } from './test-fixtures'

const mpesa = {
  type: 'mobile_money',
  network: 'mpesa',
  display_name: 'M-Pesa',
  status: 'available' as const,
  input_fields: [{ name: 'phone', type: 'tel' as const, required: true, label: 'M-Pesa number', calling_code: '+254' }],
}
const card = (status: 'available' | 'temporarily_unavailable') => ({ type: 'card', display_name: 'Card', status, input_fields: [] })

describe('widgetView methods', () => {
  it('offers card as a greyed tab while the session marks it temporarily unavailable', () => {
    const view = widgetView(context({ available_methods: [mpesa, card('temporarily_unavailable')] }))
    expect(view.methods).toEqual(['mobile_money'])
    expect(view.unavailableMethods).toEqual(['card'])
  })

  it('offers card as payable when it is available', () => {
    const view = widgetView(context({ available_methods: [mpesa, card('available')] }))
    expect(view.methods).toEqual(['mobile_money', 'card'])
    expect(view.unavailableMethods).toEqual([])
  })

  it('shows no card tab when the session does not list card', () => {
    expect(widgetView(context({ available_methods: [mpesa] })).unavailableMethods).toEqual([])
  })
})
