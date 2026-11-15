import { useCallback, useEffect, useMemo, useState } from 'react'
import { MitumbaPay, PayError } from '@mitumba/pay-react'
import { SecureSheet, SessionCheckout, type SessionCredentials } from './SessionApp'
import { checkConnection, firstFailure, pendingChecks, readFrameFacts, settle, type FrameFacts, type SecureCheck } from './secure-checks'

/**
 * A payment link (`/i/<token>`), opened on its own as a page rather than as an overlay in a store's
 * checkout. The token is redeemed for a checkout session bound to this page's origin; from there the
 * checkout is the same one the overlay shows. The page refuses to run inside a frame, so a link cannot
 * be wrapped by another site.
 */

/** Where the buyer goes when they close a payment link page. */
export const LINK_CLOSE_URL = 'https://app.mitumba.africa/orders'

/** The token in a payment link's path, or null when the path is not one. */
export function linkTokenFromPath(pathname: string): string | null {
  const match = /^\/i\/([A-Za-z0-9_-]+)\/?$/.exec(pathname)
  return match ? match[1]! : null
}

/** The frame checks for a link page: a secure connection, and the page is not framed. */
export function linkFrameChecks(facts: FrameFacts): SecureCheck[] {
  const checks = settle(pendingChecks(), 'connection', checkConnection(facts))
  if (firstFailure(checks)) return checks
  return settle(checks, 'frame', facts.embedded ? 'Open this payment link in your browser.' : null)
}

/** What a payment link that could not be redeemed tells the buyer. */
export function linkRefusal(error: unknown): string {
  if (error instanceof PayError && error.code === 'not_found') return 'This order either expired or doesn’t exist.'
  if (error instanceof PayError && error.code === 'order_not_payable') return 'This order is already paid.'
  return 'We couldn’t load this payment. Try the link again in a moment.'
}

export function LinkApp({
  token,
  client,
  onClose = () => window.location.assign(LINK_CLOSE_URL),
}: {
  token: string
  client?: Pick<MitumbaPay, 'redeemPaymentLink'>
  onClose?: () => void
}) {
  const payClient = useMemo(() => client ?? new MitumbaPay({}), [client])
  const facts = useMemo(readFrameFacts, [])
  const [checks, setChecks] = useState<SecureCheck[]>(() => linkFrameChecks(facts))
  const [creds, setCreds] = useState<SessionCredentials | null>(null)
  const refused = firstFailure(checks) !== null

  useEffect(() => {
    if (refused || creds) return
    let active = true
    payClient
      .redeemPaymentLink(token)
      .then((session) => {
        if (active) setCreds({ sessionId: session.session_id, clientSecret: session.client_secret })
      })
      .catch((error: unknown) => {
        if (active) setChecks((current) => settle(current, 'session', linkRefusal(error)))
      })
    return () => {
      active = false
    }
  }, [payClient, token, refused, creds])

  const close = useCallback(() => onClose(), [onClose])

  if (!creds || refused) return <SecureSheet checks={checks} onClose={close} />

  return (
    <SessionCheckout
      parentOrigin={window.location.origin}
      sessionId={creds.sessionId}
      clientSecret={creds.clientSecret}
      frameChecks={checks}
      onClose={close}
    />
  )
}
