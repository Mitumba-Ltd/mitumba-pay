/** Canonical public API base. Override for staging/self-hosting. */
export const DEFAULT_BASE_URL = 'https://api.mitumba.africa'

export interface MitumbaPayConfig {
  /**
   * API base URL. Defaults to {@link DEFAULT_BASE_URL}.
   */
  baseUrl?: string
  /**
   * A bearer token, or a (possibly async) function returning one. The core client
   * is auth-agnostic: it attaches the token as `Authorization: Bearer <token>`.
   * Token acquisition and refresh are the host application's responsibility.
   */
  token?: string | (() => string | undefined | Promise<string | undefined>)
  /** Max retries on network errors and 5xx responses. Default 3. */
  maxRetries?: number
  /** Custom fetch implementation (e.g. for RN or tests). Defaults to global fetch. */
  fetch?: typeof fetch
  /** Log request/response lines to the console. Default false. */
  debug?: boolean
}

export interface RequestOptions {
  /** Abort signal to cancel the in-flight request. */
  signal?: AbortSignal
  /**
   * Per-request bearer override. When set, this value is sent as
   * `Authorization: Bearer <token>` for this request instead of the client's
   * configured token. Used for session-scoped calls that authenticate with a
   * checkout-session client secret rather than the buyer bearer token.
   */
  token?: string
}
