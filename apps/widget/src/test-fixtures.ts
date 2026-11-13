import type { CheckoutSessionContext } from '@mitumba/pay-react'

/** A valid open session context for tests; override any field. */
export function context(over: Partial<CheckoutSessionContext> = {}): CheckoutSessionContext {
  return {
    version: 1,
    session_id: 'cs_1',
    session_status: 'open',
    market: { code: 'KE', name: 'Kenya' },
    amount: { currency: 'KES', minor_units: 615000 },
    line_items: [
      { label: 'Items', amount: { currency: 'KES', minor_units: 585000 } },
      { label: 'Delivery', amount: { currency: 'KES', minor_units: 30000 } },
    ],
    reference: 'CHK-1',
    available_methods: [
      {
        type: 'mobile_money',
        network: 'mpesa',
        display_name: 'M-Pesa',
        status: 'available',
        input_fields: [{ name: 'phone', type: 'tel', required: true, label: 'Phone', calling_code: '+254', example: '+254712345678' }],
      },
    ],
    parent_origin: 'https://app.mitumba.africa',
    return_url: null,
    cancel_url: null,
    expires_at: '2026-11-13T18:00:00Z',
    server_time: '2026-11-13T17:00:00Z',
    saved_methods: [],
    ...over,
  }
}
