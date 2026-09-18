import {
  initiateCheckoutInputSchema,
  initiateCheckoutResponseSchema,
  checkoutStatusResponseSchema,
  type InitiateCheckoutInput,
  type InitiateCheckoutResponse,
  type CheckoutStatusResponse,
} from '@mitumba/pay-contract'
import { HttpClient } from './http'
import type { MitumbaPayConfig, RequestOptions } from './config'
import { pollCheckoutStatus, type PollOptions } from './polling'

/**
 * The Mitumba Pay client. Headless and provider-neutral: it exposes only the
 * provider-agnostic checkout contract. It never names or routes to a provider.
 */
export class MitumbaPay {
  private readonly http: HttpClient

  constructor(config: MitumbaPayConfig = {}) {
    this.http = new HttpClient(config)
  }

  /**
   * Initiate a provider-neutral checkout for an order. The backend selects the
   * collection provider; the caller selects only a payment method. Poll
   * {@link getCheckoutStatus} after completing `next_action`.
   *
   * @remarks
   * **Backend route pending deployment.** `POST /pay/checkout/initiate` is a
   * documented `version: 1` contract but may not be live in every environment
   * yet. Verify the backend route is deployed before calling this in
   * production. `getCheckoutStatus` is live and safe to use today.
   */
  async initiateCheckout(
    input: InitiateCheckoutInput,
    options?: RequestOptions,
  ): Promise<InitiateCheckoutResponse> {
    const body = initiateCheckoutInputSchema.parse(input)
    const raw = await this.http.post<unknown>('/pay/checkout/initiate', body, options)
    return initiateCheckoutResponseSchema.parse(raw)
  }

  /**
   * Read the authoritative buyer-visible checkout lifecycle for a retail or bale
   * order. This is the endpoint to poll after initiation.
   */
  async getCheckoutStatus(
    orderId: string,
    options?: RequestOptions,
  ): Promise<CheckoutStatusResponse> {
    const raw = await this.http.get<unknown>(
      `/pay/checkout-status/${encodeURIComponent(orderId)}`,
      options,
    )
    return checkoutStatusResponseSchema.parse(raw)
  }

  /**
   * Convenience: poll {@link getCheckoutStatus} until a terminal or retryable
   * state, honoring server-authored `poll_after_ms` with jitter.
   */
  async pollCheckoutStatus(
    orderId: string,
    options?: PollOptions,
  ): Promise<CheckoutStatusResponse | null> {
    return pollCheckoutStatus((id, opts) => this.getCheckoutStatus(id, opts), orderId, options)
  }
}
