# @mitumba/pay-widget-app (private)

A Vite + React demo that hosts [`@mitumba/pay-react`](../../packages/react), deployed to
`pay.mitumba.africa/widget`. **Private — never published to npm** (in the Changesets
`ignore` list).

## Security

This app is open source and contains **no secrets**. The access token is entered at
runtime by the operator (or via a `VITE_PAY_TOKEN` env var for local dev only, never
committed). Order IDs and phone numbers in the UI are placeholders.

## Develop

```bash
npm run dev -w @mitumba/pay-widget-app
```
