/**
 * @mitumba/pay — headless, provider-neutral payment client for Africa.
 *
 * Knows the shape of requests/responses (via @mitumba/pay-contract) and nothing
 * about how payments are processed. No provider implementations, no secrets.
 */
export { MitumbaPay } from './client'
export { HttpClient } from './http'
export { PayError } from './errors'
export { DEFAULT_BASE_URL } from './config'
export type { MitumbaPayConfig, RequestOptions } from './config'
export { pollCheckoutStatus } from './polling'
export type { PollOptions, FetchStatus } from './polling'

// Re-export the wire contract for convenience so consumers need one import.
export * from '@mitumba/pay-contract'
