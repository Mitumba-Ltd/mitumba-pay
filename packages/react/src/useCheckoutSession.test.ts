import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCheckoutSession } from './useCheckoutSession'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const contextBody = {
  version: 1,
  session_id: 'cs_1',
  session_status: 'open',
  market: { code: 'KE', name: 'Kenya' },
  amount: { currency: 'KES', minor_units: 125000 },
  line_items: [{ label: 'Order total', amount: { currency: 'KES', minor_units: 125000 } }],
  reference: 'ord_1',
  available_methods: [
    { type: 'mobile_money', display_name: 'Mobile money', status: 'available', input_fields: [] },
  ],
  parent_origin: 'https://marketplace.example',
  return_url: null,
  cancel_url: null,
  expires_at: '2026-01-01T00:15:00Z',
  server_time: '2026-01-01T00:00:00Z',
  saved_methods: [],
}

describe('useCheckoutSession', () => {
  it('loads context into the ready phase', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(contextBody))
    const { result } = renderHook(() =>
      useCheckoutSession({ fetch: fetchImpl }, 'cs_1', 'csec_1'),
    )
    await act(async () => {
      await result.current.loadContext()
    })
    expect(result.current.phase).toBe('ready')
    expect(result.current.context?.amount.minor_units).toBe(125000)
    // Context read used the client secret, not a buyer token.
    const call = fetchImpl.mock.calls[0]!
    expect((call[1] as RequestInit).headers as Headers).toBeTruthy()
    expect(((call[1] as RequestInit).headers as Headers).get('Authorization')).toBe('Bearer csec_1')
  })

  it('surfaces a context load error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401))
    const { result } = renderHook(() =>
      useCheckoutSession({ fetch: fetchImpl }, 'cs_1', 'bad'),
    )
    await act(async () => {
      await result.current.loadContext()
    })
    expect(result.current.phase).toBe('error')
    expect(result.current.error?.code).toBe('unauthorized')
  })

  it('drives an attempt to the paid terminal phase', async () => {
    const attemptBody = {
      version: 1,
      id: 'att_1',
      sequence: 1,
      provider: 'daraja',
      status: 'initiated',
      terminal: false,
      next_action: { type: 'await_confirmation' },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const paidStatus = {
      version: 1,
      session_id: 'cs_1',
      session_status: 'complete',
      checkout_status: 'paid',
      terminal: true,
      retryable: false,
      latest_attempt: null,
      server_time: '2026-01-01T00:00:05Z',
      poll_after_ms: 1,
    }
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(attemptBody, 201))
      .mockResolvedValueOnce(jsonResponse(paidStatus))
    const { result } = renderHook(() =>
      useCheckoutSession({ fetch: fetchImpl }, 'cs_1', 'csec_1'),
    )
    await act(async () => {
      await result.current.pay({ type: 'mobile_money', network: 'mpesa', phone: '+254712345678' }, 'intent_1')
    })
    await waitFor(() => expect(result.current.phase).toBe('paid'))
    expect(result.current.status?.checkout_status).toBe('paid')
  })

  it('reports a retryable terminal attempt', async () => {
    const attemptBody = {
      version: 1,
      id: 'att_1',
      sequence: 1,
      provider: 'daraja',
      status: 'initiated',
      terminal: false,
      next_action: { type: 'await_confirmation' },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const failedStatus = {
      version: 1,
      session_id: 'cs_1',
      session_status: 'open',
      checkout_status: 'failed',
      terminal: false,
      retryable: true,
      latest_attempt: null,
      server_time: '2026-01-01T00:00:05Z',
      poll_after_ms: 1,
    }
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(attemptBody, 201))
      .mockResolvedValueOnce(jsonResponse(failedStatus))
    const { result } = renderHook(() =>
      useCheckoutSession({ fetch: fetchImpl }, 'cs_1', 'csec_1'),
    )
    await act(async () => {
      await result.current.pay({ type: 'card' }, 'intent_2')
    })
    await waitFor(() => expect(result.current.phase).toBe('retryable'))
  })
})

describe('useCheckoutSession saving a number', () => {
  const attemptBody = {
    version: 1,
    id: 'att_1',
    sequence: 1,
    provider: 'daraja',
    status: 'initiated',
    terminal: false,
    next_action: { type: 'await_confirmation' },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
  const paidStatus = {
    version: 1,
    session_id: 'cs_1',
    session_status: 'complete',
    checkout_status: 'paid',
    terminal: true,
    retryable: false,
    latest_attempt: null,
    server_time: '2026-01-01T00:00:05Z',
    poll_after_ms: 1,
  }
  const attemptBodySent = async (options?: { saveMethod?: boolean }) => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse(attemptBody, 201)).mockResolvedValueOnce(jsonResponse(paidStatus))
    const { result } = renderHook(() => useCheckoutSession({ fetch: fetchImpl }, 'cs_1', 'csec_1'))
    await act(async () => {
      await result.current.pay({ type: 'mobile_money', network: 'mpesa', phone: '+254712345678' }, 'intent_1', options)
    })
    return JSON.parse(String((fetchImpl.mock.calls[0]![1] as RequestInit).body))
  }

  it('asks to save the number when told to', async () => {
    expect((await attemptBodySent({ saveMethod: true })).save_method).toBe(true)
  })

  it('does not ask otherwise', async () => {
    expect(await attemptBodySent()).not.toHaveProperty('save_method')
    expect(await attemptBodySent({ saveMethod: false })).not.toHaveProperty('save_method')
  })
})
