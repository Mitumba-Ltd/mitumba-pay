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

// Session-driven checkout controller (RFC 0001).
export { useCheckoutSession } from './useCheckoutSession'
export type {
  SessionPhase,
  UseCheckoutSessionState,
  UseCheckoutSessionResult,
} from './useCheckoutSession'
export { MitumbaPayButton, MitumbaPayWidget } from './components'
export type {
  MitumbaPayButtonProps,
  MitumbaPayWidgetProps,
  WidgetMethod,
  WidgetLineItem,
  WidgetMetadataItem,
  WidgetSavedPhone,
} from './components'
export { payTheme } from './theme'
export { unavailableMessage } from './unavailable'
export type { PayTheme } from './theme'

// Hosted-checkout bridge v2 protocol (RFC 0001).
export {
  BRIDGE_VERSION_V2,
  MITUMBA_PAY_MESSAGE,
  isBridgeMessage,
  isBridgeInitMessage,
} from './bridge'
export type {
  MitumbaPayMessageType,
  BridgeInitPayload,
  BridgeInitMessage,
  BridgeMessage,
} from './bridge'

// Framework-neutral hosted-checkout launcher (RFC 0001).
export { openMitumbaPay, DEFAULT_HOSTED_WIDGET_URL } from './launcher'
export type { OpenMitumbaPayOptions, MitumbaPayResult, MitumbaPayOutcome } from './launcher'

// Convenience re-exports so widget consumers need a single import.
export {
  MitumbaPay,
  PayError,
  currencyDigits,
  formatMoney,
  isValidPhone,
  nationalPart,
  normalizePhone,
} from '@mitumba/pay'
export type {
  MitumbaPayConfig,
  InitiateCheckoutInput,
  CheckoutStatusResponse,
  CheckoutNextAction,
  CheckoutSessionContext,
  CheckoutSessionStatusResponse,
  CheckoutMethodDescriptor,
  SessionPaymentMethod,
  Money,
  PhoneFormat,
  SavedPaymentMethod,
  SavedPaymentMethodsResponse,
  SavePaymentMethodInput,
  SavedPhoneChoice,
} from '@mitumba/pay'

export { savedPhoneChoices } from '@mitumba/pay'
