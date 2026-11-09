import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MitumbaPayWidget } from './components'
import { PayError } from '@mitumba/pay'
import type { UseCheckoutResult } from './useCheckout'

const idleCheckout: UseCheckoutResult = {
  phase: 'idle',
  status: null,
  nextAction: null,
  error: null,
  start: vi.fn(),
  cancel: vi.fn(),
  reset: vi.fn(),
}

const baseProps = {
  checkout: idleCheckout,
  amountLabel: 'KES 6,000.00',
  orderId: 'ORD-2048-KE',
  lineItems: [{ label: 'Delivery', value: 'KES 150.00' }],
  onPay: vi.fn(),
}

afterEach(() => cleanup())

describe('MitumbaPayWidget', () => {
  it('leads with mobile payment and preserves the order summary hierarchy', () => {
    render(<MitumbaPayWidget {...baseProps} />)

    expect(screen.getByRole('tab', { name: 'Mobile payment' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getAllByText('KES 6,000.00').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Delivery')).toBeTruthy()
    expect(screen.getByText('ORD-2048-KE')).toBeTruthy()
  })

  it('normalizes a local number for the market it is given and submits a provider-neutral method', () => {
    const onPay = vi.fn()
    render(
      <MitumbaPayWidget
        {...baseProps}
        onPay={onPay}
        phoneFormat={{ callingCode: '+254', nationalLength: [9], example: '+254712345678' }}
      />,
    )

    const input = screen.getByLabelText(/Mobile number/i)
    expect(input.getAttribute('placeholder')).toBe('+254712345678')
    fireEvent.change(input, { target: { value: '0712 345 678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pay KES 6,000.00' }))

    expect(onPay).toHaveBeenCalledWith({ method: 'mobile_money', phone: '+254712345678' })
  })

  it('follows another market rather than assuming Kenya', () => {
    const onPay = vi.fn()
    render(<MitumbaPayWidget {...baseProps} onPay={onPay} phoneFormat={{ callingCode: '+256', nationalLength: [9] }} />)

    const input = screen.getByLabelText(/Mobile number/i)
    fireEvent.change(input, { target: { value: '+254712345678' } })
    expect((screen.getByRole('button', { name: 'Pay KES 6,000.00' }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(input, { target: { value: '0772 123 456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pay KES 6,000.00' }))
    expect(onPay).toHaveBeenCalledWith({ method: 'mobile_money', phone: '+256772123456' })
  })

  it('without a market phone format, accepts only a full international number', () => {
    const onPay = vi.fn()
    render(<MitumbaPayWidget {...baseProps} onPay={onPay} />)

    const input = screen.getByLabelText(/Mobile number/i)
    fireEvent.change(input, { target: { value: '0712 345 678' } })
    expect((screen.getByRole('button', { name: 'Pay KES 6,000.00' }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(input, { target: { value: '+255712345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pay KES 6,000.00' }))
    expect(onPay).toHaveBeenCalledWith({ method: 'mobile_money', phone: '+255712345678' })
  })

  it('says payments are temporarily unavailable on a 503, with the server-requested wait', () => {
    render(
      <MitumbaPayWidget
        {...baseProps}
        checkout={{
          ...idleCheckout,
          phase: 'unavailable',
          error: new PayError(503, { error: 'payment_initiation_paused' }, { retryAfterMs: 15 * 60_000 }),
        }}
      />,
    )

    expect(screen.getByRole('alert').textContent).toBe(
      'Payments are temporarily unavailable. Nothing was charged. Please try again in about 15 minutes.',
    )
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('switches to card without collecting raw card details', () => {
    const onPay = vi.fn()
    render(<MitumbaPayWidget {...baseProps} onPay={onPay} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Card' }))
    expect(screen.getByText('Secure card checkout')).toBeTruthy()
    expect(screen.queryByText('CVV')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Pay KES 6,000.00' }))

    expect(onPay).toHaveBeenCalledWith({ method: 'card' })
  })

  it('renders a focused out-of-band confirmation state', () => {
    render(
      <MitumbaPayWidget
        {...baseProps}
        checkout={{ ...idleCheckout, phase: 'awaiting_confirmation' }}
      />,
    )

    expect(screen.getByText('Check your phone')).toBeTruthy()
    expect(screen.getByText(/enter your PIN/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Pay KES/ })).toBeNull()
  })

  it('renders the supplied brand logo instead of the fallback letter mark', () => {
    render(<MitumbaPayWidget {...baseProps} logoUrl="/widget/mitumba-pay-logo.png" />)
    expect(screen.getAllByRole('img', { name: 'Mitumba Pay' }).length).toBeGreaterThanOrEqual(1)
  })
})
