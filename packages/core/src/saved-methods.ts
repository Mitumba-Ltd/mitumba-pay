import type { MobileMoneyNetwork, SavedPaymentMethod } from '@mitumba/pay-contract'

/** One saved number, shaped for a picker (e.g. `MitumbaPayWidget`'s `savedPhones`). */
export interface SavedPhoneChoice {
  /**
   * What the buyer sees: the network or their label, and the last three digits, e.g. "M-Pesa ••• 678"
   * or "Work · Airtel Money ••• 222".
   */
  label: string
  /** The E.164 number to send. */
  value: string
  /** The network the number is saved on; send it with the number. */
  network: string
  is_default: boolean
}

/**
 * Saved methods (from the payment-methods API or a session's `saved_methods`) as picker choices, default first, with the number hidden down to its last three
 * digits so the label is safe to show on a shared screen.
 *
 * Pass the market's `mobile_money_networks` so a buyer-chosen label still says which network the
 * number pays from. Without them the label is the saved label alone, which is the network's name
 * unless the buyer renamed it.
 */
export function savedPhoneChoices(
  methods: readonly Pick<SavedPaymentMethod, 'label' | 'method' | 'is_default'>[],
  networks: readonly MobileMoneyNetwork[] = [],
): SavedPhoneChoice[] {
  return [...methods]
    .sort((a, b) => Number(b.is_default) - Number(a.is_default))
    .map((saved) => {
      const networkName = networks.find((network) => network.id === saved.method.network)?.name
      const name = networkName && networkName !== saved.label ? `${saved.label} · ${networkName}` : saved.label
      return {
        label: `${name} ••• ${saved.method.phone.slice(-3)}`,
        value: saved.method.phone,
        network: saved.method.network,
        is_default: saved.is_default,
      }
    })
}
