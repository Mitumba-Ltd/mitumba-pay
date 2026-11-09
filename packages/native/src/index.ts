/**
 * @mitumba/pay-native — React Native view layer over @mitumba/pay.
 *
 * A native bottom sheet + headless checkout controller. No WebView; payment
 * initiation and polling go through the typed core client. Provider-neutral.
 */
export { useCheckout } from './useCheckout'
export type { CheckoutPhase, UseCheckoutState, UseCheckoutResult } from './useCheckout'
export { MitumbaPaySheet } from './MitumbaPaySheet'
export type {
  MitumbaPaySheetProps,
  NativePaymentMethod,
  NativeLineItem,
  NativePayInput,
} from './MitumbaPaySheet'
export { descriptorPhone, initialNetwork, isNetworkPayable, sessionMethodFor } from './methods'
export type { NativeNetwork } from './methods'

// Session-driven checkout (RFC 0001).
export { useCheckoutSession } from './useCheckoutSession'
export type {
  SessionPhase,
  UseCheckoutSessionState,
  UseCheckoutSessionResult,
} from './useCheckoutSession'
export { MitumbaPaySessionSheet } from './MitumbaPaySessionSheet'
export type { MitumbaPaySessionSheetProps } from './MitumbaPaySessionSheet'
export { formatMoney } from './formatMoney'
export { unavailableMessage } from './unavailable'

export { payTheme } from './theme'
export type { PayTheme } from './theme'

export { MitumbaPay, PayError, currencyDigits, isValidPhone, nationalPart, normalizePhone } from '@mitumba/pay'
export type {
  MitumbaPayConfig,
  InitiateCheckoutInput,
  CheckoutStatusResponse,
  CheckoutNextAction,
  CheckoutSessionContext,
  CheckoutSessionStatusResponse,
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResponse,
  SessionPaymentMethod,
  Money,
  PhoneFormat,
  SavedPaymentMethod,
  SavedPaymentMethodsResponse,
  SavePaymentMethodInput,
  SavedPhoneChoice,
  CheckoutMethodDescriptor,
  MobileMoneyNetwork,
  Market,
} from '@mitumba/pay'

export { methodDescriptorKey, savedPhoneChoices } from '@mitumba/pay'
