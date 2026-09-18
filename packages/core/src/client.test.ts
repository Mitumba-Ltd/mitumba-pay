import { describe, it, expect, vi } from 'vitest'
import { MitumbaPay, PayError, pollCheckoutStatus } from './index'
import type { CheckoutStatusResponse } from '@mitumba/pay-contract'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const statusBase: CheckoutStatusResponse = {
  version: 1,
  order_id: 'ord_1',
  order: { type: 'retail', status: 'payment_pending' },
  checkout_status: 'pending',
  terminal: false,
  retryable: false,
  amount: { currency: 'KES', minor_units: 125000 },
  latest_attempt: null,
  attempt_count: 0,
  order_updated_at: '2026-01-01T00:00:00Z',
  status_updated_at: '2026-01-01T00:00:00Z',
  server_time: '2026-01-01T00:00:00Z',
  poll_after_ms: 1,
}

describe('MitumbaPay client', () => {
  it('initiates a mobile_money checkout and validates the response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        version: 1,
        order_id: 'ord_1',
        attempt: { id: 'att_1', sequence: 1, provider: 'daraja', status: 'initiated' },
        next_action: { type: 'await_confirmation' },
      }),
    )
    const pay = new MitumbaPay({ fetch: fetchImpl, token: 'tok_123' })
    const res = await pay.initiateCheckout({
      order_id: 'ord_1',
      idempotency_key: 'idem_1',
      method: { type: 'mobile_money', phone: '+254712345678' },
    })
    expect(res.next_action.type).toBe('await_confirmation')

    const call = fetchImpl.mock.calls[0]!
    const [url, init] = call
    expect(url).toBe('https://api.mitumba.africa/pay/checkout/initiate')
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer tok_123')
  })

  it('rejects invalid input before hitting the network', async () => {
    const fetchImpl = vi.fn()
    const pay = new MitumbaPay({ fetch: fetchImpl })
    await expect(
      pay.initiateCheckout({
        order_id: 'ord_1',
        idempotency_key: 'idem_1',
        method: { type: 'mobile_money', phone: '0712345678' },
      }),
    ).rejects.toThrow()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('maps an API error envelope to PayError', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: 'order_not_payable' }, 409))
    const pay = new MitumbaPay({ fetch: fetchImpl })
    await expect(pay.getCheckoutStatus('ord_1')).rejects.toMatchObject({
      code: 'order_not_payable',
      status: 409,
    })
    await expect(pay.getCheckoutStatus('ord_1')).rejects.toBeInstanceOf(PayError)
  })

  it('reads checkout status', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ...statusBase, checkout_status: 'paid', terminal: true }))
    const pay = new MitumbaPay({ fetch: fetchImpl })
    const res = await pay.getCheckoutStatus('ord_1')
    expect(res.checkout_status).toBe('paid')
  })
})

describe('pollCheckoutStatus', () => {
  it('stops on a terminal state', async () => {
    const seq: CheckoutStatusResponse[] = [
      { ...statusBase },
      { ...statusBase, checkout_status: 'paid', terminal: true },
    ]
    let i = 0
    const fetchStatus = vi.fn().mockImplementation(async () => seq[Math.min(i++, seq.length - 1)])
    const updates: string[] = []
    const last = await pollCheckoutStatus(fetchStatus, 'ord_1', {
      onUpdate: (s) => updates.push(s.checkout_status),
      jitter: 0,
    })
    expect(last?.terminal).toBe(true)
    expect(updates).toEqual(['pending', 'paid'])
  })

  it('stops and reports a retryable state', async () => {
    const fetchStatus = vi
      .fn()
      .mockResolvedValue({ ...statusBase, checkout_status: 'failed', retryable: true })
    const last = await pollCheckoutStatus(fetchStatus, 'ord_1', { jitter: 0 })
    expect(last?.retryable).toBe(true)
    expect(fetchStatus).toHaveBeenCalledTimes(1)
  })

  it('honors an abort signal', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetchStatus = vi.fn().mockResolvedValue({ ...statusBase })
    const last = await pollCheckoutStatus(fetchStatus, 'ord_1', {
      signal: controller.signal,
      jitter: 0,
    })
    expect(last).toBeNull()
    expect(fetchStatus).not.toHaveBeenCalled()
  })
})
