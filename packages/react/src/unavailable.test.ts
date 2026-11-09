import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCheckout } from './useCheckout'
import { useCheckoutSession } from './useCheckoutSession'
import { unavailableMessage } from './unavailable'

function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

describe('unavailable phase', () => {
  it('useCheckout reports a paused initiation as unavailable, not as an error', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'payment_initiation_paused' }, 503, { 'Retry-After': '300' }))
    const { result } = renderHook(() => useCheckout({ fetch: fetchImpl, token: 't' }))

    await act(async () => {
      await result.current.start({ order_id: 'ord_1', idempotency_key: 'k', method: { type: 'card' } })
    })

    expect(result.current.phase).toBe('unavailable')
    expect(result.current.error?.code).toBe('payment_initiation_paused')
    expect(result.current.error?.retryAfterMs).toBe(300_000)
  })

  it('useCheckout still reports a rejected request as an error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: 'order_not_payable' }, 409))
    const { result } = renderHook(() => useCheckout({ fetch: fetchImpl, token: 't' }))

    await act(async () => {
      await result.current.start({ order_id: 'ord_1', idempotency_key: 'k', method: { type: 'card' } })
    })

    expect(result.current.phase).toBe('error')
  })

  it('useCheckoutSession reports an unavailable provider on attempt as unavailable', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'payment_provider_unavailable' }, 503, { 'Retry-After': '120' }))
    const { result } = renderHook(() => useCheckoutSession({ fetch: fetchImpl }, 'cs_1', 'csec_1'))

    await act(async () => {
      await result.current.pay({ type: 'card' }, 'intent_1')
    })

    expect(result.current.phase).toBe('unavailable')
    expect(result.current.error?.isUnavailable).toBe(true)
  })
})

describe('unavailableMessage', () => {
  it.each([
    [null, 'Please try again shortly.'],
    [30_000, 'Please try again in a minute.'],
    [15 * 60_000, 'Please try again in about 15 minutes.'],
    [60 * 60_000, 'Please try again in about 1 hour.'],
    [3 * 60 * 60_000, 'Please try again in about 3 hours.'],
  ])('describes a wait of %s ms', (ms, ending) => {
    expect(unavailableMessage(ms)).toBe(`Payments are temporarily unavailable. Nothing was charged. ${ending}`)
  })
})
