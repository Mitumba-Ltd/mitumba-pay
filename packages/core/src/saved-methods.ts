import type { SavedPaymentMethod } from '@mitumba/pay-contract'

/** One saved number, shaped for a picker (e.g. `MitumbaPayWidget`'s `savedPhones`). */
export interface SavedPhoneChoice {
  /** What the buyer sees: their label and the last three digits, e.g. "Work ••• 678". */
  label: string
  /** The E.164 number to send. */
  value: string
  is_default: boolean
}

/**
 * Saved methods as picker choices, default first, with the number hidden down to its last three
 * digits so the label is safe to show on a shared screen.
 */
export function savedPhoneChoices(methods: readonly SavedPaymentMethod[]): SavedPhoneChoice[] {
  return [...methods]
    .sort((a, b) => Number(b.is_default) - Number(a.is_default))
    .map((saved) => ({
      label: `${saved.label} ••• ${saved.method.phone.slice(-3)}`,
      value: saved.method.phone,
      is_default: saved.is_default,
    }))
}
