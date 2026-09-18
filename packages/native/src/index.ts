/**
 * @mitumba/pay-native — React Native view layer over @mitumba/pay.
 *
 * A native bottom sheet + headless checkout controller. No WebView; payment
 * initiation and polling go through the typed core client. Provider-neutral.
 */
export { useCheckout } from './useCheckout'
export type { CheckoutPhase, UseCheckoutState, UseCheckoutResult } from './useCheckout'
export { MitumbaPaySheet } from './MitumbaPaySheet'
export type { MitumbaPaySheetProps } from './MitumbaPaySheet'
export { payTheme } from './theme'
export type { PayTheme } from './theme'

export { MitumbaPay, PayError } from '@mitumba/pay'
export type {
  MitumbaPayConfig,
  InitiateCheckoutInput,
  CheckoutStatusResponse,
  CheckoutNextAction,
} from '@mitumba/pay'
