/**
 * The wire-contract version carried by every Mitumba Pay response body as the
 * `version` field. Clients key response-model compatibility off this value, not
 * off the URL (the HTTP API is currently unversioned at the path level).
 *
 * Bump only on a breaking change to the response shape.
 */
export const PAY_CONTRACT_VERSION = 1 as const

export type PayContractVersion = typeof PAY_CONTRACT_VERSION
