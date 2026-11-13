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
  networks: [
    { id: 'mpesa', name: 'M-Pesa' },
    { id: 'airtel_money', name: 'Airtel Money' },
  ],
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

    const input = screen.getByLabelText(/^M-Pesa number/)
    expect(input.getAttribute('placeholder')).toBe('+254712345678')
    fireEvent.change(input, { target: { value: '0712 345 678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pay KES 6,000.00' }))

    expect(onPay).toHaveBeenCalledWith({ method: 'mobile_money', network: 'mpesa', phone: '+254712345678' })
  })

  it('follows another market rather than assuming Kenya', () => {
    const onPay = vi.fn()
    render(<MitumbaPayWidget {...baseProps} onPay={onPay} phoneFormat={{ callingCode: '+256', nationalLength: [9] }} />)

    const input = screen.getByLabelText(/^M-Pesa number/)
    fireEvent.change(input, { target: { value: '+254712345678' } })
    expect((screen.getByRole('button', { name: 'Pay KES 6,000.00' }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(input, { target: { value: '0772 123 456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pay KES 6,000.00' }))
    expect(onPay).toHaveBeenCalledWith({ method: 'mobile_money', network: 'mpesa', phone: '+256772123456' })
  })

  it('without a market phone format, accepts only a full international number', () => {
    const onPay = vi.fn()
    render(<MitumbaPayWidget {...baseProps} onPay={onPay} />)

    const input = screen.getByLabelText(/^M-Pesa number/)
    fireEvent.change(input, { target: { value: '0712 345 678' } })
    expect((screen.getByRole('button', { name: 'Pay KES 6,000.00' }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(input, { target: { value: '+255712345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pay KES 6,000.00' }))
    expect(onPay).toHaveBeenCalledWith({ method: 'mobile_money', network: 'mpesa', phone: '+255712345678' })
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

  it('shows the server message when the payment could not start', () => {
    render(
      <MitumbaPayWidget
        {...baseProps}
        checkout={{ ...idleCheckout, phase: 'error', error: new PayError(422, { error: 'payment_method_unavailable', message: 'No provider reaches that network.' }) }}
      />,
    )
    expect(screen.getByRole('alert').textContent).toBe('No provider reaches that network.')
  })

  it('gives the market example when the number is not valid', () => {
    render(<MitumbaPayWidget {...baseProps} phoneFormat={{ callingCode: '+254', nationalLength: [9], example: '+254712345678' }} />)
    fireEvent.change(screen.getByLabelText(/^M-Pesa number/), { target: { value: '0712' } })
    expect(screen.getByText('Enter a valid mobile number, for example +254712345678')).toBeTruthy()
  })

  it('follows the methods the host offers, including a change to them', () => {
    const { rerender } = render(<MitumbaPayWidget {...baseProps} methods={[]} />)
    expect(screen.queryByRole('tab', { name: 'Card' })).toBeNull()
    expect(screen.getByRole('radiogroup', { name: 'Mobile money network' })).toBeTruthy()

    rerender(<MitumbaPayWidget {...baseProps} methods={['card']} />)
    expect(screen.getByRole('tab', { name: 'Card' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Secure card checkout')).toBeTruthy()
  })

  describe('mobile-money network', () => {
    const kenya = { callingCode: '+254', nationalLength: [9], example: '+254712345678' }

    it('asks which network the number pays from and sends the prompt to that one', () => {
      const onPay = vi.fn()
      render(<MitumbaPayWidget {...baseProps} onPay={onPay} phoneFormat={kenya} />)

      const group = screen.getByRole('radiogroup', { name: 'Mobile money network' })
      expect(group.textContent).toContain('M-Pesa')
      expect(screen.getByRole('radio', { name: 'M-Pesa' }).getAttribute('aria-checked')).toBe('true')

      fireEvent.click(screen.getByRole('radio', { name: 'Airtel Money' }))
      expect(screen.getByRole('radio', { name: 'Airtel Money' }).getAttribute('aria-checked')).toBe('true')
      fireEvent.change(screen.getByLabelText(/^Airtel Money number/), { target: { value: '0733 000 222' } })
      expect(screen.getByText('A secure Airtel Money prompt will appear on this phone.')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Pay KES 6,000.00' }))

      expect(onPay).toHaveBeenCalledWith({ method: 'mobile_money', network: 'airtel_money', phone: '+254733000222' })
    })

    it('shows a network that cannot take payments now as unavailable and never preselects it', () => {
      const onPay = vi.fn()
      render(
        <MitumbaPayWidget
          {...baseProps}
          onPay={onPay}
          phoneFormat={kenya}
          networks={[
            { id: 'airtel_money', name: 'Airtel Money', available: false },
            { id: 'mpesa', name: 'M-Pesa' },
          ]}
          defaultNetwork="airtel_money"
        />,
      )

      const airtel = screen.getByRole('radio', { name: /Airtel Money/ }) as HTMLButtonElement
      expect(airtel.disabled).toBe(true)
      expect(airtel.textContent).toContain('Temporarily unavailable')
      expect(screen.getByRole('radio', { name: 'M-Pesa' }).getAttribute('aria-checked')).toBe('true')

      fireEvent.change(screen.getByLabelText(/^M-Pesa number/), { target: { value: '0712345678' } })
      fireEvent.click(screen.getByRole('button', { name: 'Pay KES 6,000.00' }))
      expect(onPay).toHaveBeenCalledWith({ method: 'mobile_money', network: 'mpesa', phone: '+254712345678' })
    })

    it('preselects the default network the host gives', () => {
      render(<MitumbaPayWidget {...baseProps} defaultNetwork="airtel_money" />)
      expect(screen.getByRole('radio', { name: 'Airtel Money' }).getAttribute('aria-checked')).toBe('true')
    })

    it('a saved number selects the network it is saved on', () => {
      const onPay = vi.fn()
      render(
        <MitumbaPayWidget
          {...baseProps}
          onPay={onPay}
          phoneFormat={kenya}
          savedPhones={[
            { label: 'M-Pesa ••• 678', value: '+254712345678', network: 'mpesa' },
            { label: 'Work · Airtel Money ••• 222', value: '+254733000222', network: 'airtel_money' },
          ]}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Work · Airtel Money ••• 222' }))
      expect(screen.getByRole('radio', { name: 'Airtel Money' }).getAttribute('aria-checked')).toBe('true')
      expect(screen.getByRole('button', { name: 'Work · Airtel Money ••• 222' }).className).toContain('is-selected')
      expect(screen.getByRole('button', { name: 'M-Pesa ••• 678' }).className).not.toContain('is-selected')
      fireEvent.click(screen.getByRole('button', { name: 'Pay KES 6,000.00' }))

      expect(onPay).toHaveBeenCalledWith({ method: 'mobile_money', network: 'airtel_money', phone: '+254733000222' })
    })

    it('disables a saved number whose network cannot take payments now', () => {
      render(
        <MitumbaPayWidget
          {...baseProps}
          networks={[
            { id: 'mpesa', name: 'M-Pesa' },
            { id: 'airtel_money', name: 'Airtel Money', available: false },
          ]}
          savedPhones={[{ label: 'Airtel Money ••• 222', value: '+254733000222', network: 'airtel_money' }]}
        />,
      )
      expect((screen.getByRole('button', { name: 'Airtel Money ••• 222' }) as HTMLButtonElement).disabled).toBe(true)
    })

    it('a saved number without a network keeps the chosen network', () => {
      const onPay = vi.fn()
      render(<MitumbaPayWidget {...baseProps} onPay={onPay} savedPhones={[{ label: '••• 678', value: '+254712345678' }]} />)

      fireEvent.click(screen.getByRole('radio', { name: 'Airtel Money' }))
      fireEvent.click(screen.getByRole('button', { name: '••• 678' }))
      expect(screen.getByRole('button', { name: '••• 678' }).className).toContain('is-selected')
      fireEvent.click(screen.getByRole('button', { name: 'Pay KES 6,000.00' }))
      expect(onPay).toHaveBeenCalledWith({ method: 'mobile_money', network: 'airtel_money', phone: '+254712345678' })
    })

    it('cannot pay by mobile money when no network is offered, and says so', () => {
      render(<MitumbaPayWidget {...baseProps} networks={[]} defaultPhone="+254712345678" />)

      expect(screen.getByRole('note').textContent).toContain('Mobile money isn’t available')
      expect(screen.queryByRole('radiogroup', { name: 'Mobile money network' })).toBeNull()
      expect((screen.getByRole('button', { name: 'Pay KES 6,000.00' }) as HTMLButtonElement).disabled).toBe(true)
    })

    it('cannot pay when every offered network is unavailable', () => {
      render(
        <MitumbaPayWidget
          {...baseProps}
          networks={[{ id: 'mpesa', name: 'M-Pesa', available: false }]}
          defaultPhone="+254712345678"
        />,
      )

      expect(screen.getByLabelText(/^Mobile number/)).toBeTruthy()
      expect(screen.getByText('Choose the network your number pays from.')).toBeTruthy()
      expect((screen.getByRole('button', { name: 'Pay KES 6,000.00' }) as HTMLButtonElement).disabled).toBe(true)
    })

    it('moves off a network that stops being offered', () => {
      const { rerender } = render(<MitumbaPayWidget {...baseProps} defaultNetwork="airtel_money" />)
      expect(screen.getByRole('radio', { name: 'Airtel Money' }).getAttribute('aria-checked')).toBe('true')

      rerender(<MitumbaPayWidget {...baseProps} networks={[{ id: 'mpesa', name: 'M-Pesa' }]} defaultNetwork="airtel_money" />)
      expect(screen.getByRole('radio', { name: 'M-Pesa' }).getAttribute('aria-checked')).toBe('true')
    })
  })
})

describe('MitumbaPayWidget saving a number', () => {
  const kenya = { callingCode: '+254', nationalLength: [9], example: '+254712345678' }
  const saved = [{ label: 'M-Pesa ••• 678', value: '+254712345678', network: 'mpesa' }]

  it('offers to save a new valid number, on by default, and sends the choice', () => {
    const onPay = vi.fn()
    render(<MitumbaPayWidget {...baseProps} onPay={onPay} phoneFormat={kenya} offerToSave />)
    expect(screen.queryByLabelText('Save this number for next time')).toBeNull()

    fireEvent.change(screen.getByLabelText(/^M-Pesa number/), { target: { value: '0733 331 042' } })
    const save = screen.getByLabelText('Save this number for next time') as HTMLInputElement
    expect(save.checked).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Pay KES 6,000.00' }))
    expect(onPay).toHaveBeenLastCalledWith({ method: 'mobile_money', network: 'mpesa', phone: '+254733331042', save: true })

    fireEvent.click(save)
    fireEvent.click(screen.getByRole('button', { name: 'Pay KES 6,000.00' }))
    expect(onPay).toHaveBeenLastCalledWith({ method: 'mobile_money', network: 'mpesa', phone: '+254733331042' })
  })

  it('does not offer to save a number that is already saved', () => {
    const onPay = vi.fn()
    render(<MitumbaPayWidget {...baseProps} onPay={onPay} phoneFormat={kenya} savedPhones={saved} defaultPhone="+254712345678" offerToSave />)
    expect(screen.queryByLabelText('Save this number for next time')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Pay KES 6,000.00' }))
    expect(onPay).toHaveBeenCalledWith({ method: 'mobile_money', network: 'mpesa', phone: '+254712345678' })
  })

  it('never offers it unless asked to', () => {
    render(<MitumbaPayWidget {...baseProps} phoneFormat={kenya} />)
    fireEvent.change(screen.getByLabelText(/^M-Pesa number/), { target: { value: '0733 331 042' } })
    expect(screen.queryByLabelText('Save this number for next time')).toBeNull()
  })
})
