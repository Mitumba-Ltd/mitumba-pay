import { normalizePhone, type CheckoutMethodDescriptor, type SessionPaymentMethod } from '@mitumba/pay'

/**
 * A mobile-money network the buyer can pay from, e.g. a market's `mobile_money_networks`. Set
 * `available: false` to show it as temporarily unavailable rather than hiding it.
 */
export interface NativeNetwork {
  id: string
  name: string
  available?: boolean
}

/** Whether `id` is an offered network that can take a payment now. */
export function isNetworkPayable(networks: readonly NativeNetwork[], id: string | null): boolean {
  return networks.some((network) => network.id === id && network.available !== false)
}

/** The preferred network when it can take a payment, else the first that can, else none. */
export function initialNetwork(networks: readonly NativeNetwork[], preferred: string | undefined): string | null {
  if (preferred !== undefined && isNetworkPayable(networks, preferred)) return preferred
  return networks.find((network) => network.available !== false)?.id ?? null
}

/**
 * The descriptor's phone as E.164: normalized against the field's calling code when the session
 * supplies one (so `0712 345 678` works), otherwise taken as typed. Undefined when nothing is typed or
 * the method has no phone field; null when what was typed is not a number in the session's market.
 */
export function descriptorPhone(
  descriptor: CheckoutMethodDescriptor,
  values: Readonly<Record<string, string>>,
): string | null | undefined {
  const field = descriptor.input_fields.find((f) => f.name === 'phone')
  const raw = (values.phone ?? '').trim()
  if (!field || raw === '') return undefined
  if (!field.calling_code) return raw
  return normalizePhone(raw, { callingCode: field.calling_code })
}

/**
 * The typed attempt method for a descriptor and the buyer's input. Mobile money needs the
 * descriptor's network and a valid phone; card carries no fields. A descriptor this SDK does not know
 * how to pay, or mobile money without a network, returns null: the UI never guesses where to send a
 * payment.
 */
export function sessionMethodFor(
  descriptor: CheckoutMethodDescriptor,
  values: Readonly<Record<string, string>>,
): SessionPaymentMethod | null {
  if (descriptor.type === 'card') return { type: 'card' }
  if (descriptor.type === 'mobile_money' && descriptor.network) {
    const phone = descriptorPhone(descriptor, values)
    return phone ? { type: 'mobile_money', network: descriptor.network, phone } : null
  }
  return null
}
