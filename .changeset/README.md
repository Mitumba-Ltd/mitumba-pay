# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

Each publishable package (`@mitumba/pay`, `@mitumba/pay-contract`, `@mitumba/pay-react`,
`@mitumba/pay-native`) versions **independently** — they are not lock-stepped. Run
`npm run changeset` to record a change, then CI opens a Release PR and publishes to npm
via OIDC / Trusted Publisher with provenance (no stored NPM_TOKEN).

The private apps (`apps/widget`, `apps/docs`) are in the `ignore` list and never published.
