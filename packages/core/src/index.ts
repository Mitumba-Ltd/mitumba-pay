/**
 * @mitumba/pay — headless, provider-neutral payment client for Africa.
 *
 * Knows the shape of requests/responses (via @mitumba/pay-contract) and nothing
 * about how payments are processed. No provider implementations, no secrets.
 */
export { MitumbaPay, PaymentMethods } from './client'
export { savedPhoneChoices } from './saved-methods'
export type { SavedPhoneChoice } from './saved-methods'
export { HttpClient } from './http'
export { PayError, parseRetryAfter } from './errors'
export type { PayErrorOptions } from './errors'
export { isValidPhone, nationalPart, normalizePhone } from './phone'
export type { PhoneFormat } from './phone'
export { currencyDigits, formatMoney } from './money'
export { DEFAULT_BASE_URL } from './config'
export type { MitumbaPayConfig, RequestOptions } from './config'
export { pollCheckoutStatus, pollStatus } from './polling'
export type {
  PollOptions,
  PollStatusOptions,
  PollSessionOptions,
  PollableStatus,
  FetchStatus,
} from './polling'

// Re-export the wire contract for convenience so consumers need one import.
export * from '@mitumba/pay-contract'
