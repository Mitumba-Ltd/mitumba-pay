/**
 * @mitumba/pay-react — React web view layer over @mitumba/pay.
 *
 * Provider-neutral payment UI. The hook owns behavior (via the core state
 * machine); the components own presentation.
 */
export { useCheckout } from './useCheckout'
export type {
  CheckoutPhase,
  UseCheckoutState,
  UseCheckoutResult,
} from './useCheckout'
export { MitumbaPayButton, MitumbaPayWidget } from './components'
export type {
  MitumbaPayButtonProps,
  MitumbaPayWidgetProps,
  WidgetMethod,
} from './components'
export { payTheme } from './theme'
export type { PayTheme } from './theme'

// Convenience re-exports so widget consumers need a single import.
export { MitumbaPay, PayError } from '@mitumba/pay'
export type {
  MitumbaPayConfig,
  InitiateCheckoutInput,
  CheckoutStatusResponse,
  CheckoutNextAction,
} from '@mitumba/pay'
