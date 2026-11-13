import { describe, it, expect } from 'vitest'
import {
  allPassed,
  checkConnection,
  checkFrame,
  checkMerchant,
  checkMethods,
  checkSession,
  firstFailure,
  pendingChecks,
  settle,
  type FrameFacts,
} from './secure-checks'
import { context } from './test-fixtures'

const STORE = 'https://app.mitumba.africa'

const facts = (over: Partial<FrameFacts> = {}): FrameFacts => ({
  isSecureContext: true,
  protocol: 'https:',
  hostname: 'pay.mitumba.africa',
  embedded: true,
  parentOrigin: STORE,
  referrer: `${STORE}/`,
  width: 1280,
  height: 800,
  ...over,
})

describe('checkConnection', () => {
  it('passes on https', () => expect(checkConnection(facts())).toBeNull())
  it('fails outside a secure context', () => expect(checkConnection(facts({ isSecureContext: false }))).not.toBeNull())
  it('fails on plain http off loopback', () => expect(checkConnection(facts({ protocol: 'http:' }))).not.toBeNull())
  it('allows http on localhost', () =>
    expect(checkConnection(facts({ protocol: 'http:', hostname: 'localhost' }))).toBeNull())
})

describe('checkFrame', () => {
  it('passes for the full-viewport overlay opened by the named store', () => expect(checkFrame(facts())).toBeNull())
  it('refuses a top-level page', () => expect(checkFrame(facts({ embedded: false }))).toMatch(/store checkout/))
  it('refuses when the parent is not named', () => expect(checkFrame(facts({ parentOrigin: null }))).not.toBeNull())
  it('refuses a non-web parent origin', () => expect(checkFrame(facts({ parentOrigin: 'javascript:alert(1)' }))).not.toBeNull())
  it('refuses when the referrer is a different site', () =>
    expect(checkFrame(facts({ referrer: 'https://evil.example/' }))).toMatch(/different site/))
  it('accepts an empty referrer (strict referrer policy)', () => expect(checkFrame(facts({ referrer: '' }))).toBeNull())
  it('refuses a frame too small to see', () => expect(checkFrame(facts({ width: 1, height: 1 }))).toMatch(/too small/))
})

describe('checkMerchant', () => {
  it('passes when the session is bound to the framing site', () => expect(checkMerchant(context(), STORE)).toBeNull())
  it('normalises a trailing slash', () => expect(checkMerchant(context({ parent_origin: `${STORE}/` }), STORE)).toBeNull())
  it('refuses a session created for another site', () =>
    expect(checkMerchant(context({ parent_origin: 'https://other.example' }), STORE)).toMatch(/different store/))
  it('refuses when the framing site is unknown', () => expect(checkMerchant(context(), null)).not.toBeNull())
})

describe('checkSession', () => {
  it('passes an open session before expiry', () => expect(checkSession(context())).toBeNull())
  it('passes a processing session', () => expect(checkSession(context({ session_status: 'processing' }))).toBeNull())
  it('refuses a paid session', () => expect(checkSession(context({ session_status: 'complete' }))).toMatch(/already paid/))
  it('refuses an expired session', () => expect(checkSession(context({ session_status: 'expired' }))).toMatch(/expired/))
  it('refuses a cancelled session', () => expect(checkSession(context({ session_status: 'cancelled' }))).toMatch(/cancelled/))
  it('refuses an open session past expiry by server time', () =>
    expect(checkSession(context({ expires_at: '2026-11-13T16:59:59Z' }))).toMatch(/expired/))
  it('ignores unparseable times rather than guessing', () =>
    expect(checkSession(context({ expires_at: 'soon', server_time: 'now' }))).toBeNull())
})

describe('checkMethods', () => {
  it('passes with an available network', () => expect(checkMethods(context())).toBeNull())
  it('passes with an available card', () =>
    expect(checkMethods(context({ available_methods: [{ type: 'card', display_name: 'Card', status: 'available', input_fields: [] }] }))).toBeNull())
  it('refuses when every method is unavailable', () => {
    const [mpesa] = context().available_methods
    expect(checkMethods(context({ available_methods: [{ ...mpesa!, status: 'temporarily_unavailable' }] }))).not.toBeNull()
  })
  it('refuses mobile money without a network', () => {
    const [mpesa] = context().available_methods
    expect(checkMethods(context({ available_methods: [{ ...mpesa!, network: undefined }] }))).not.toBeNull()
  })
})

describe('check list', () => {
  it('starts pending, settles, and reports the first failure', () => {
    let checks = pendingChecks()
    expect(allPassed(checks)).toBe(false)
    checks = settle(checks, 'connection', null)
    checks = settle(checks, 'frame', 'too small')
    expect(firstFailure(checks)).toMatchObject({ id: 'frame', reason: 'too small' })
    for (const id of ['frame', 'merchant', 'session', 'methods'] as const) checks = settle(checks, id, null)
    expect(allPassed(checks)).toBe(true)
  })
})
