import type { PayErrorBody } from '@mitumba/pay-contract'
import { PayError, parseRetryAfter } from './errors'
import { DEFAULT_BASE_URL, type MitumbaPayConfig, type RequestOptions } from './config'

const RETRYABLE_METHODS = new Set(['GET'])

/**
 * Minimal, framework-agnostic HTTP client. No JWT refresh rotation — token
 * acquisition is the host's job (see {@link MitumbaPayConfig.token}). Retries
 * network errors and 5xx with exponential backoff; GET is idempotent-safe to
 * retry, POST is only retried on network errors (never after a server response).
 */
export class HttpClient {
  private readonly baseUrl: string
  private readonly maxRetries: number
  private readonly fetchImpl: typeof fetch
  private readonly debug: boolean
  private readonly tokenSource: MitumbaPayConfig['token']

  constructor(config: MitumbaPayConfig = {}) {
    this.baseUrl = stripTrailingSlashes(config.baseUrl ?? DEFAULT_BASE_URL)
    this.maxRetries = config.maxRetries ?? 3
    this.fetchImpl = config.fetch ?? globalThis.fetch
    this.debug = config.debug ?? false
    this.tokenSource = config.token
    if (typeof this.fetchImpl !== 'function') {
      throw new Error(
        'No fetch implementation available. Provide `fetch` in the config for this runtime.',
      )
    }
  }

  private async resolveToken(): Promise<string | undefined> {
    if (typeof this.tokenSource === 'function') return this.tokenSource()
    return this.tokenSource
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options)
  }

  async post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options)
  }

  private async request<T>(
    method: string,
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`
    const token = options?.token ?? (await this.resolveToken())

    const headers = new Headers()
    if (body !== undefined) headers.set('Content-Type', 'application/json')
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const init: RequestInit = {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    }

    const canRetry = RETRYABLE_METHODS.has(method)
    let attempt = 0
    let response: Response

    for (;;) {
      if (this.debug) console.log(`[mitumba-pay] ${method} ${url} (attempt ${attempt + 1})`)
      try {
        response = await this.fetchImpl(url, init)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') throw err
        if (attempt < this.maxRetries) {
          await backoff(++attempt)
          continue
        }
        throw new PayError(0, {
          error: 'network_error',
          message: err instanceof Error ? err.message : 'Network request failed',
        })
      }

      if (response.status >= 500 && canRetry && attempt < this.maxRetries) {
        // A 503 that names a wait longer than the backoff ceiling (payments paused, provider down)
        // is not worth blocking the caller for: surface it now so the UI can say so.
        const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After'))
        if (response.status === 503 && retryAfterMs !== null && retryAfterMs > MAX_INLINE_RETRY_MS) break
        await backoff(++attempt, retryAfterMs)
        continue
      }
      break
    }

    if (!response.ok) {
      let errBody: PayErrorBody
      try {
        errBody = (await response.json()) as PayErrorBody
      } catch {
        errBody = { error: 'unknown_error', message: response.statusText }
      }
      throw new PayError(response.status, errBody, {
        retryAfterMs: parseRetryAfter(response.headers.get('Retry-After')),
      })
    }

    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }
}

/** The longest server-requested wait the client will sit through inside one request. */
const MAX_INLINE_RETRY_MS = 2000

function backoff(attempt: number, retryAfterMs: number | null = null): Promise<void> {
  const exponential = Math.min(2 ** attempt * 100, MAX_INLINE_RETRY_MS)
  // Never retry sooner than the server asked.
  const ms = retryAfterMs === null ? exponential : Math.max(exponential, Math.min(retryAfterMs, MAX_INLINE_RETRY_MS))
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Remove trailing '/' characters with a linear scan. Avoids the polynomial
 * backtracking a `/\/+$/` regex can exhibit on adversarial input (ReDoS).
 */
function stripTrailingSlashes(value: string): string {
  let end = value.length
  while (end > 0 && value.charCodeAt(end - 1) === 47 /* '/' */) end--
  return value.slice(0, end)
}
