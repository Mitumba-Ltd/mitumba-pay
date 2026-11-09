import { describe, expect, it } from 'vitest'
import type { CheckoutMethodDescriptor } from '@mitumba/pay'
import { descriptorPhone, initialNetwork, isNetworkPayable, sessionMethodFor } from './methods'

const phoneField = { name: 'phone', type: 'tel' as const, required: true, label: 'M-Pesa number', calling_code: '+254' }

const mpesa: CheckoutMethodDescriptor = {
  type: 'mobile_money',
  network: 'mpesa',
  display_name: 'M-Pesa',
  status: 'available',
  input_fields: [phoneField],
}
const airtel: CheckoutMethodDescriptor = { ...mpesa, network: 'airtel_money', display_name: 'Airtel Money', input_fields: [{ ...phoneField, label: 'Airtel Money number' }] }
const card: CheckoutMethodDescriptor = { type: 'card', display_name: 'Card', status: 'available', input_fields: [] }

describe('sessionMethodFor', () => {
  it('sends mobile money to the network of the descriptor the buyer picked', () => {
    expect(sessionMethodFor(mpesa, { phone: '0712 345 678' })).toEqual({ type: 'mobile_money', network: 'mpesa', phone: '+254712345678' })
    expect(sessionMethodFor(airtel, { phone: '0733000222' })).toEqual({ type: 'mobile_money', network: 'airtel_money', phone: '+254733000222' })
  })

  it('never builds mobile money without a network, even with a valid number', () => {
    const legacy: CheckoutMethodDescriptor = { type: 'mobile_money', display_name: 'Mobile money', status: 'available', input_fields: [phoneField] }
    expect(sessionMethodFor(legacy, { phone: '+254712345678' })).toBeNull()
  })

  it('builds nothing until the number is valid', () => {
    expect(sessionMethodFor(mpesa, {})).toBeNull()
    expect(sessionMethodFor(mpesa, { phone: '0712' })).toBeNull()
  })

  it('pays card with no fields, and refuses a method type it does not know', () => {
    expect(sessionMethodFor(card, {})).toEqual({ type: 'card' })
    expect(sessionMethodFor({ ...card, type: 'bank_transfer' }, {})).toBeNull()
  })
})

describe('descriptorPhone', () => {
  it('normalizes against the calling code, or takes the number as typed without one', () => {
    expect(descriptorPhone(mpesa, { phone: ' 0712 345 678 ' })).toBe('+254712345678')
    expect(descriptorPhone(mpesa, { phone: '+256772123456' })).toBeNull()
    const bare = { name: 'phone', type: 'tel' as const, required: true, label: 'Mobile number' }
    expect(descriptorPhone({ ...mpesa, input_fields: [bare] }, { phone: '+256772123456' })).toBe('+256772123456')
  })

  it('is undefined when nothing is typed or the method takes no phone', () => {
    expect(descriptorPhone(mpesa, { phone: '   ' })).toBeUndefined()
    expect(descriptorPhone(card, { phone: '+254712345678' })).toBeUndefined()
  })
})

describe('network choice', () => {
  const networks = [
    { id: 'airtel_money', name: 'Airtel Money', available: false },
    { id: 'mpesa', name: 'M-Pesa' },
  ]

  it('treats only an offered, available network as payable', () => {
    expect(isNetworkPayable(networks, 'mpesa')).toBe(true)
    expect(isNetworkPayable(networks, 'airtel_money')).toBe(false)
    expect(isNetworkPayable(networks, 'tkash')).toBe(false)
    expect(isNetworkPayable(networks, null)).toBe(false)
  })

  it('preselects the preferred network only when it can take a payment', () => {
    expect(initialNetwork([...networks, { id: 'tkash', name: 'T-Kash' }], 'tkash')).toBe('tkash')
    expect(initialNetwork(networks, 'airtel_money')).toBe('mpesa')
    expect(initialNetwork(networks, undefined)).toBe('mpesa')
    expect(initialNetwork([{ id: 'mpesa', name: 'M-Pesa', available: false }], undefined)).toBeNull()
    expect(initialNetwork([], 'mpesa')).toBeNull()
  })
})
