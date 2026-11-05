import {
  initiateCheckoutInputSchema,
  initiateCheckoutResponseSchema,
  checkoutStatusResponseSchema,
  marketsResponseSchema,
  createCheckoutSessionInputSchema,
  createCheckoutSessionResponseSchema,
  checkoutSessionContextSchema,
  createAttemptInputSchema,
  checkoutAttemptSchema,
  checkoutSessionStatusResponseSchema,
  type InitiateCheckoutInput,
  type InitiateCheckoutResponse,
  type CheckoutStatusResponse,
  type MarketsResponse,
  type CreateCheckoutSessionInput,
  type CreateCheckoutSessionResponse,
  type CheckoutSessionContext,
  type CreateAttemptInput,
  type CheckoutAttempt,
  type CheckoutSessionStatusResponse,
} from '@mitumba/pay-contract'
import { HttpClient } from './http'
import type { MitumbaPayConfig, RequestOptions } from './config'
import { pollCheckoutStatus, pollStatus, type PollOptions, type PollSessionOptions } from './polling'

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

  // ─────────────────────────────────────────────────────────────────────────
  // Country-aware hosted checkout sessions (RFC 0001).
  //
  // Sessions are the long-term authority: the client never asserts country,
  // currency, amount, or provider. `createCheckoutSession` is buyer-authenticated
  // (bearer token); session context/attempt/status authenticate with the
  // session's `client_secret`, passed per-call via `options.token`.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * List the markets the platform exposes. Public, cacheable discovery. Market
   * codes, currency codes, and method types are open strings — a new market
   * never requires an SDK release.
   */
  async listMarkets(options?: RequestOptions): Promise<MarketsResponse> {
    const raw = await this.http.get<unknown>('/pay/markets', options)
    return marketsResponseSchema.parse(raw)
  }

  /**
   * Create a checkout session for an order. Buyer-authenticated via the client's
   * bearer token. No country/amount/currency/provider is submitted — all are
   * order-derived server-side. The returned `client_secret` is shown once and
   * authorizes the session-scoped reads/attempts below.
   */
  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
    options?: RequestOptions,
  ): Promise<CreateCheckoutSessionResponse> {
    const body = createCheckoutSessionInputSchema.parse(input)
    const raw = await this.http.post<unknown>('/pay/checkout-sessions', body, options)
    return createCheckoutSessionResponseSchema.parse(raw)
  }

  /**
   * Read the authoritative, immutable display context for a session (market,
   * amount, line items, server-authored available methods). Authenticated with
   * the session `clientSecret`. The UI must render only the methods returned
   * here.
   */
  async getCheckoutSessionContext(
    sessionId: string,
    clientSecret: string,
    options?: RequestOptions,
  ): Promise<CheckoutSessionContext> {
    const raw = await this.http.get<unknown>(
      `/pay/checkout-sessions/${encodeURIComponent(sessionId)}`,
      { ...options, token: clientSecret },
    )
    return checkoutSessionContextSchema.parse(raw)
  }

  /**
   * Submit a payment attempt for a session. The client supplies only the chosen
   * method and its required input; the backend selects the provider. Follow the
   * returned `next_action`; never branch on a provider. Authenticated with the
   * session `clientSecret`.
   */
  async createAttempt(
    sessionId: string,
    clientSecret: string,
    input: CreateAttemptInput,
    options?: RequestOptions,
  ): Promise<CheckoutAttempt> {
    const body = createAttemptInputSchema.parse(input)
    const raw = await this.http.post<unknown>(
      `/pay/checkout-sessions/${encodeURIComponent(sessionId)}/attempts`,
      body,
      { ...options, token: clientSecret },
    )
    return checkoutAttemptSchema.parse(raw)
  }

  /**
   * Read the authoritative aggregate checkout lifecycle for a session. This is
   * the endpoint to poll after an attempt. Authenticated with the session
   * `clientSecret`. A retryable terminal-attempt returns the session to `open`;
   * never treat an unknown state or a client timeout as payment failure.
   */
  async getCheckoutSessionStatus(
    sessionId: string,
    clientSecret: string,
    options?: RequestOptions,
  ): Promise<CheckoutSessionStatusResponse> {
    const raw = await this.http.get<unknown>(
      `/pay/checkout-sessions/${encodeURIComponent(sessionId)}/status`,
      { ...options, token: clientSecret },
    )
    return checkoutSessionStatusResponseSchema.parse(raw)
  }

  /**
   * Convenience: poll {@link getCheckoutSessionStatus} until a terminal or
   * retryable state, honoring server-authored `poll_after_ms` with jitter. A
   * client-deadline timeout means "still confirming," never payment failure.
   */
  async pollCheckoutSessionStatus(
    sessionId: string,
    clientSecret: string,
    options?: PollSessionOptions,
  ): Promise<CheckoutSessionStatusResponse | null> {
    return pollStatus<CheckoutSessionStatusResponse>(
      (signal) => this.getCheckoutSessionStatus(sessionId, clientSecret, { signal }),
      options,
    )
  }
}
