import { describe, it, expect, vi } from 'vitest'
import { MitumbaPay, PayError, pollStatus } from './index'
import type { CheckoutSessionStatusResponse } from '@mitumba/pay-contract'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function authHeader(call: unknown[]): string | null {
  const init = call[1] as RequestInit
  return (init.headers as Headers).get('Authorization')
}

describe('MitumbaPay sessions', () => {
  it('lists markets', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        version: 1,
        updated_at: '2026-01-01T00:00:00Z',
        markets: [
          {
            code: 'KE',
            name: 'Kenya',
            status: 'active',
            currency: { code: 'KES', minor_unit: 2, symbol: 'KSh', locale: 'en-KE' },
            calling_code: '+254',
            supported_methods: ['mobile_money', 'card'],
          },
        ],
      }),
    )
    const pay = new MitumbaPay({ fetch: fetchImpl })
    const res = await pay.listMarkets()
    expect(res.markets[0]?.code).toBe('KE')
    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api.mitumba.africa/pay/markets')
  })

  it('creates a session with the buyer bearer token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        version: 1,
        session_id: 'cs_1',
        client_secret: 'csec_1',
        expires_at: '2026-01-01T00:15:00Z',
        hosted_url: 'https://pay.mitumba.africa/widget?session=cs_1',
      }),
    )
    const pay = new MitumbaPay({ fetch: fetchImpl, token: 'buyer_tok' })
    const res = await pay.createCheckoutSession({
      source: { type: 'order', id: 'ord_1' },
      parent_origin: 'https://marketplace.example',
    })
    expect(res.session_id).toBe('cs_1')
    const call = fetchImpl.mock.calls[0]!
    expect(call[0]).toBe('https://api.mitumba.africa/pay/checkout-sessions')
    expect(authHeader(call)).toBe('Bearer buyer_tok')
  })

  it('reads session context with the client secret, not the buyer token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        version: 1,
        session_id: 'cs_1',
        session_status: 'open',
        market: { code: 'KE', name: 'Kenya' },
        amount: { currency: 'KES', minor_units: 125000 },
        line_items: [],
        reference: 'ord_1',
        available_methods: [],
        parent_origin: 'https://marketplace.example',
        return_url: null,
        cancel_url: null,
        expires_at: '2026-01-01T00:15:00Z',
        server_time: '2026-01-01T00:00:00Z',
      }),
    )
    const pay = new MitumbaPay({ fetch: fetchImpl, token: 'buyer_tok' })
    const ctx = await pay.getCheckoutSessionContext('cs_1', 'csec_1')
    expect(ctx.session_status).toBe('open')
    const call = fetchImpl.mock.calls[0]!
    expect(call[0]).toBe('https://api.mitumba.africa/pay/checkout-sessions/cs_1')
    expect(authHeader(call)).toBe('Bearer csec_1')
  })

  it('submits an attempt with the client secret and validates input', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        id: 'att_1',
        sequence: 1,
        provider: 'daraja',
        status: 'initiated',
        terminal: false,
        next_action: { type: 'await_confirmation' },
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }),
    )
    const pay = new MitumbaPay({ fetch: fetchImpl })
    const attempt = await pay.createAttempt('cs_1', 'csec_1', {
      idempotency_key: 'intent_1',
      method: { type: 'mobile_money', phone: '+254712345678' },
    })
    expect(attempt.next_action?.type).toBe('await_confirmation')
    const call = fetchImpl.mock.calls[0]!
    expect(call[0]).toBe('https://api.mitumba.africa/pay/checkout-sessions/cs_1/attempts')
    expect(authHeader(call)).toBe('Bearer csec_1')
  })

  it('rejects a malformed attempt phone before the network', async () => {
    const fetchImpl = vi.fn()
    const pay = new MitumbaPay({ fetch: fetchImpl })
    await expect(
      pay.createAttempt('cs_1', 'csec_1', {
        idempotency_key: 'intent_1',
        method: { type: 'mobile_money', phone: '0712345678' },
      }),
    ).rejects.toThrow()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('reads session status with the client secret', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        version: 1,
        session_id: 'cs_1',
        session_status: 'complete',
        checkout_status: 'paid',
        terminal: true,
        retryable: false,
        latest_attempt: null,
        server_time: '2026-01-01T00:00:00Z',
        poll_after_ms: 2000,
      }),
    )
    const pay = new MitumbaPay({ fetch: fetchImpl })
    const res = await pay.getCheckoutSessionStatus('cs_1', 'csec_1')
    expect(res.checkout_status).toBe('paid')
    const call = fetchImpl.mock.calls[0]!
    expect(call[0]).toBe('https://api.mitumba.africa/pay/checkout-sessions/cs_1/status')
    expect(authHeader(call)).toBe('Bearer csec_1')
  })

  it('maps a session API error envelope to PayError', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401))
    const pay = new MitumbaPay({ fetch: fetchImpl })
    await expect(pay.getCheckoutSessionStatus('cs_1', 'bad')).rejects.toBeInstanceOf(PayError)
  })
})

describe('session polling', () => {
  const base: CheckoutSessionStatusResponse = {
    version: 1,
    session_id: 'cs_1',
    session_status: 'open',
    checkout_status: 'pending',
    terminal: false,
    retryable: false,
    latest_attempt: null,
    server_time: '2026-01-01T00:00:00Z',
    poll_after_ms: 1,
  }

  it('polls session status to a terminal paid state', async () => {
    const seq: CheckoutSessionStatusResponse[] = [
      { ...base },
      { ...base, session_status: 'complete', checkout_status: 'paid', terminal: true },
    ]
    let i = 0
    const fetchImpl = vi.fn().mockImplementation(async () =>
      jsonResponse(seq[Math.min(i++, seq.length - 1)]),
    )
    const pay = new MitumbaPay({ fetch: fetchImpl })
    const updates: string[] = []
    const last = await pay.pollCheckoutSessionStatus('cs_1', 'csec_1', {
      jitter: 0,
      onUpdate: (s) => updates.push(s.checkout_status),
    })
    expect(last?.terminal).toBe(true)
    expect(updates).toEqual(['pending', 'paid'])
  })

  it('stops and reports a retryable session state', async () => {
    const fetchOnce = vi
      .fn()
      .mockResolvedValue({ ...base, checkout_status: 'failed', retryable: true })
    const last = await pollStatus<CheckoutSessionStatusResponse>(fetchOnce, { jitter: 0 })
    expect(last?.retryable).toBe(true)
    expect(fetchOnce).toHaveBeenCalledTimes(1)
  })
})
