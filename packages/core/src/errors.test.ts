import { describe, it, expect, vi, afterEach } from 'vitest'
import { MitumbaPay, PayError, parseRetryAfter } from './index'

function response(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('parseRetryAfter', () => {
  const now = Date.parse('2026-11-09T10:00:00Z')

  it('reads delta-seconds', () => {
    expect(parseRetryAfter('120', now)).toBe(120_000)
    expect(parseRetryAfter(' 0 ', now)).toBe(0)
  })

  it('reads an HTTP-date, never negative', () => {
    expect(parseRetryAfter('Mon, 09 Nov 2026 10:05:00 GMT', now)).toBe(300_000)
    expect(parseRetryAfter('Mon, 09 Nov 2026 09:00:00 GMT', now)).toBe(0)
  })

  it('returns null for an absent, empty or unparseable header', () => {
    expect(parseRetryAfter(null, now)).toBeNull()
    expect(parseRetryAfter(undefined, now)).toBeNull()
    expect(parseRetryAfter('', now)).toBeNull()
    expect(parseRetryAfter('soon', now)).toBeNull()
    expect(parseRetryAfter('99999999999999999999', now)).toBeNull()
  })
})

describe('PayError', () => {
  it('marks 503 as unavailable and keeps the deprecated alias', () => {
    const paused = new PayError(503, { error: 'payment_initiation_paused' }, { retryAfterMs: 60_000 })
    expect(paused.isUnavailable).toBe(true)
    expect(paused.isTemporary).toBe(true)
    expect(paused.retryAfterMs).toBe(60_000)

    const rejected = new PayError(422, { error: 'payment_method_unavailable' })
    expect(rejected.isUnavailable).toBe(false)
    expect(rejected.retryAfterMs).toBeNull()
  })
})

describe('HTTP 503 handling', () => {
  it('carries Retry-After on the thrown PayError when initiation is paused', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(response({ error: 'payment_initiation_paused', message: 'Payments are paused.' }, 503, { 'Retry-After': '900' }))
    const pay = new MitumbaPay({ fetch: fetchImpl, token: 't' })

    const error = await pay
      .initiateCheckout({ order_id: 'ord_1', idempotency_key: 'k', method: { type: 'card' } })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(PayError)
    expect((error as PayError).code).toBe('payment_initiation_paused')
    expect((error as PayError).isUnavailable).toBe(true)
    expect((error as PayError).retryAfterMs).toBe(900_000)
    // POST is never retried after a server response.
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('does not sit in a retry loop on a GET when the server asks for a long wait', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ error: 'payment_provider_unavailable' }, 503, { 'Retry-After': '600' }))
    const pay = new MitumbaPay({ fetch: fetchImpl, token: 't' })

    const error = (await pay.getCheckoutStatus('ord_1').catch((caught: unknown) => caught)) as PayError

    expect(error.isUnavailable).toBe(true)
    expect(error.retryAfterMs).toBe(600_000)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('retries a GET 503 with a short Retry-After, waiting at least that long', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({ error: 'payment_provider_unavailable' }, 503, { 'Retry-After': '1' }))
      .mockResolvedValueOnce(response({ error: 'not_found' }, 404))
    const pay = new MitumbaPay({ fetch: fetchImpl, token: 't' })

    const pending = pay.getCheckoutStatus('ord_1').catch((caught: unknown) => caught)
    await vi.advanceTimersByTimeAsync(999)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    const error = (await pending) as PayError

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(error.status).toBe(404)
  })
})
