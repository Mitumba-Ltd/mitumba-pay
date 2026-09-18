import type { PayErrorBody } from '@mitumba/pay-contract'
import { PayError } from './errors'
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
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
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
    const token = await this.resolveToken()

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
        await backoff(++attempt)
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
      throw new PayError(response.status, errBody)
    }

    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }
}

function backoff(attempt: number): Promise<void> {
  const ms = Math.min(2 ** attempt * 100, 2000)
  return new Promise((resolve) => setTimeout(resolve, ms))
}
