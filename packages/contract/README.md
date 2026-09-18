# @mitumba/pay-contract

The wire contract for the [Mitumba Pay](https://github.com/Mitumba-Ltd/mitumba-pay) HTTP API:
TypeScript types + [zod](https://zod.dev) schemas + the contract version constant.

This package is the **single source of truth** consumed by `@mitumba/pay`,
`@mitumba/pay-react`, and `@mitumba/pay-native`. It is provider-neutral: it describes
*what* the client sends and *what* comes back, never *how* a payment is processed. It
contains zero provider implementations, zero routing rules, and zero secrets.

## The core principle

The client chooses a payment **method** (`mobile_money` or `card`). The backend chooses
the **provider** (Daraja, Airtel, Paystack, …). `ProviderId` is an *open* union —
the backend can add a new provider and return it as metadata without any SDK release.
Never branch on an exhaustive provider switch; follow `next_action` instead.

## Exports

- `initiateCheckoutInputSchema` / `InitiateCheckoutInput`
- `initiateCheckoutResponseSchema` / `InitiateCheckoutResponse`
- `checkoutStatusResponseSchema` / `CheckoutStatusResponse`
- `ProviderId`, `KnownPaymentProvider`, `KNOWN_PAYMENT_PROVIDERS`
- `CheckoutStatus`, `PaymentAttemptStatus`, `RetailOrderStatus`, `BaleOrderStatus`
- `PayErrorCode`, `PayErrorBody`, `CHECKOUT_INITIATE_ERROR_STATUS`
- `PAY_CONTRACT_VERSION`

## License

MIT
