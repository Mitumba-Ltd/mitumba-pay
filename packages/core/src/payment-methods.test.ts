import { describe, it, expect, vi } from 'vitest'
import { MitumbaPay, PayError, savedPhoneChoices } from './index'
import type { SavedPaymentMethod } from '@mitumba/pay-contract'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const saved = (over: Partial<SavedPaymentMethod> = {}): SavedPaymentMethod => ({
  id: 'pm_1',
  market_code: 'KE',
  method: { type: 'mobile_money', network: 'mpesa', phone: '+254712345678' },
  label: 'M-Pesa',
  is_default: true,
  created_at: '2026-11-09T10:00:00Z',
  ...over,
})

const call = (fetchImpl: ReturnType<typeof vi.fn>, index = 0) => {
  const [url, init] = fetchImpl.mock.calls[index] as [string, RequestInit]
  return { url, init, headers: init.headers as Headers }
}

describe('pay.paymentMethods', () => {
  it('lists a market with the buyer token and validates the response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ version: 1, market_code: 'KE', data: [saved()] }))
    const pay = new MitumbaPay({ fetch: fetchImpl, token: 'tok' })

    const res = await pay.paymentMethods.list('KE')

    expect(res.data[0]?.method.phone).toBe('+254712345678')
    const { url, init, headers } = call(fetchImpl)
    expect(url).toBe('https://api.mitumba.africa/pay/payment-methods?market=KE')
    expect(init.method).toBe('GET')
    expect(headers.get('Authorization')).toBe('Bearer tok')
  })

  it('rejects a malformed list instead of offering a bad number', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ version: 1, market_code: 'KE', data: [saved({ method: { type: 'mobile_money', network: 'mpesa', phone: '0712' } })] }))
    await expect(new MitumbaPay({ fetch: fetchImpl }).paymentMethods.list('KE')).rejects.toThrow()
  })

  it('saves a local-form number and returns the saved method', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ data: saved({ label: 'Work' }) }, 201))
    const pay = new MitumbaPay({ fetch: fetchImpl, token: 'tok' })

    const result = await pay.paymentMethods.save({
      market_code: 'KE',
      method: { type: 'mobile_money', network: 'mpesa', phone: ' 0712 345 678 ' },
      label: ' Work ',
      make_default: true,
    })

    expect(result.label).toBe('Work')
    const { url, init } = call(fetchImpl)
    expect(url).toBe('https://api.mitumba.africa/pay/payment-methods')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      market_code: 'KE',
      method: { type: 'mobile_money', network: 'mpesa', phone: '0712 345 678' },
      label: 'Work',
      make_default: true,
    })
  })

  it('validates save input before any request', async () => {
    const fetchImpl = vi.fn()
    const pay = new MitumbaPay({ fetch: fetchImpl })
    await expect(pay.paymentMethods.save({ market_code: 'KE', method: { type: 'mobile_money', network: 'mpesa', phone: '  ' } })).rejects.toThrow()
    await expect(
      pay.paymentMethods.save({ market_code: 'KE', method: { type: 'mobile_money', network: '', phone: '0712345678' } }),
    ).rejects.toThrow()
    await expect(
      pay.paymentMethods.save({ market_code: 'KE', method: { type: 'mobile_money', network: 'mpesa', phone: '0712345678' }, label: 'x'.repeat(41) }),
    ).rejects.toThrow()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('surfaces the server code, e.g. a card that cannot be saved', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ error: 'invalid_phone', message: 'Not a number here.' }, 400))
    const error = await new MitumbaPay({ fetch: fetchImpl })
      .paymentMethods.save({ market_code: 'KE', method: { type: 'mobile_money', network: 'mpesa', phone: '+256772123456' } })
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(PayError)
    expect((error as PayError).code).toBe('invalid_phone')
  })

  it('removes and sets the default with an encoded id', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({ ok: true }))
      .mockResolvedValueOnce(json({ data: saved({ id: 'pm/2' }) }))
    const pay = new MitumbaPay({ fetch: fetchImpl, token: 'tok' })

    await expect(pay.paymentMethods.remove('pm/2')).resolves.toBeUndefined()
    const updated = await pay.paymentMethods.setDefault('pm/2')

    expect(call(fetchImpl, 0).url).toBe('https://api.mitumba.africa/pay/payment-methods/pm%2F2')
    expect(call(fetchImpl, 0).init.method).toBe('DELETE')
    expect(call(fetchImpl, 1).url).toBe('https://api.mitumba.africa/pay/payment-methods/pm%2F2/default')
    expect(call(fetchImpl, 1).init.method).toBe('POST')
    expect(call(fetchImpl, 1).init.body).toBeUndefined()
    expect(updated.id).toBe('pm/2')
  })
})

describe('savedPhoneChoices', () => {
  it('puts the default first, hides all but the last three digits, and keeps the network', () => {
    const choices = savedPhoneChoices([
      saved({ id: 'a', label: 'Work', is_default: false, method: { type: 'mobile_money', network: 'airtel_money', phone: '+254733000222' } }),
      saved({ id: 'b', label: 'Main', is_default: true, method: { type: 'mobile_money', network: 'mpesa', phone: '+254712345678' } }),
    ])
    expect(choices).toEqual([
      { label: 'Main ••• 678', value: '+254712345678', network: 'mpesa', is_default: true },
      { label: 'Work ••• 222', value: '+254733000222', network: 'airtel_money', is_default: false },
    ])
  })

  it('names the network beside a buyer label, but not twice beside the default label', () => {
    const networks = [
      { id: 'mpesa', name: 'M-Pesa' },
      { id: 'airtel_money', name: 'Airtel Money' },
    ]
    const choices = savedPhoneChoices(
      [
        saved({ id: 'a', label: 'M-Pesa', method: { type: 'mobile_money', network: 'mpesa', phone: '+254712345678' } }),
        saved({ id: 'b', label: 'Work', is_default: false, method: { type: 'mobile_money', network: 'airtel_money', phone: '+254733000222' } }),
        saved({ id: 'c', label: 'Other', is_default: false, method: { type: 'mobile_money', network: 'tkash', phone: '+254770000111' } }),
      ],
      networks,
    )
    expect(choices.map((choice) => choice.label)).toEqual(['M-Pesa ••• 678', 'Work · Airtel Money ••• 222', 'Other ••• 111'])
  })
})
