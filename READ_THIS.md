Read this entire prompt before doing anything else. Do not write 
any code or publish anything until told to.

You are building mitumba-pay — a public, standalone payment SDK 
for Africa, starting with Kenya (M-Pesa via Safaricom Daraja, 
Airtel Money), architected to extend to MTN MoMo, Vodacom 
Tanzania, and Paystack later.

This repo is EMPTY. Ignore any repos under the personal GitHub 
account Stanley-blik — those are abandoned legacy prototypes, 
irrelevant to this build. Everything current lives under the 
Mitumba-Ltd org.

Work through this with Stanley directly, out loud, as you go — 
don't silently execute and summarize at checkpoints. Reason 
through tradeoffs with him in real time, flag anything that 
looks off or ambiguous the moment you notice it, and treat every 
step below as a conversation, not a task queue to clear alone.

─────────────────────────────────────
THE CORE ARCHITECTURAL PRINCIPLE — HOLD THIS THROUGHOUT
─────────────────────────────────────

Mitumba-Ltd/mitumba's workers/pay/ IS "Mitumba Pay" — the real 
payment engine. It holds every provider implementation (Daraja, 
Airtel, later MTN MoMo/Vodacom/Paystack), every credential, 
webhook secret, escrow and settlement logic, and the country+
method routing. It will keep growing there, privately, forever.

This repo (mitumba-pay, public) is NOT a mirror of that. It is a 
thin, public CLIENT SDK that talks to workers/pay/'s HTTP API. 
It must:
  - know the shape of requests/responses (the contract)
  - never contain a single provider implementation
  - never contain a credential, secret, or internal routing rule
  - never need to change just because the worker adds a new 
    country or provider behind the scenes

If at any point building this SDK seems to require knowing HOW 
a payment is actually processed rather than WHAT to send and 
WHAT comes back — stop and raise that with Stanley. That's a 
sign the worker's public API isn't cleanly separated from its 
internals yet, and that's a real problem to solve together 
before writing more SDK code, not something to work around.

─────────────────────────────────────
STEP 1 — GATHER CONTEXT (read-only, temp clones, delete after)
─────────────────────────────────────

Clone each into a temp folder, extract what's needed, delete:

1. Mitumba-Ltd/mitumba
   → ARCHITECTURE.md
   → workers/pay/ — is it still Intasend or already Daraja/
     Airtel direct? Does it expose a clean, versioned public 
     HTTP API (routes, request/response schemas), or is 
     provider logic and API surface tangled together?
   → Report this to Stanley plainly and discuss it before 
     assuming anything — this determines whether the SDK has 
     a real contract to build against yet.
   → The escrow/order state machine, so the SDK's types and 
     polling states match it.

2. Mitumba-Ltd/mitumba-ui
   → COMPONENT_SPEC.md, @mitumba/tokens (green #3D9A52, 
     earth #A06235, spacing, typography)
   → This repo already publishes @mitumba/ui and @mitumba/
     tokens to npm. Find and discuss with Stanley its exact:
     - package.json publishConfig
     - .changeset/config.json
     - release workflow — specifically npm OIDC/Trusted 
       Publisher setup (id-token: write, provenance, no 
       long-lived NPM_TOKEN for ongoing releases)
     - turbo.json / workspace config
   This is the template to mirror here.

3. Mitumba-Ltd/mitumba-sdk
   → Structure, HTTP client conventions, error handling, auth 
     pattern. Confirm with Stanley whether its publish setup 
     matches mitumba-ui's or differs.

4. Mitumba-Ltd/mitumba-mobile
   → ARCHITECTURE.md — Expo version, RN New Architecture, 
     navigation, state approach — so @mitumba/pay-native fits 
     without friction.

─────────────────────────────────────
STEP 2 — PROPOSE STRUCTURE AND NAMES, THEN WAIT
─────────────────────────────────────

Talk through with Stanley:
- What you found about workers/pay/'s API cleanliness (flag 
  honestly if the SDK would be getting ahead of a backend 
  that isn't ready to be a stable contract yet)
- The OIDC/Changesets/workflow pattern to mirror
- Proposed monorepo structure:
  packages/core   → @mitumba/pay        (pure TS client, 
                     zero UI deps, zero provider knowledge)
  packages/react  → @mitumba/pay-react  (the widget — source 
                     of truth for ALL payment UI, web + mobile)
  packages/native → @mitumba/pay-native (thin RN wrapper: 
                     bottom sheet + WebView loading the react 
                     widget via postMessage, bundled offline 
                     fallback)
  apps/widget     → @mitumba/pay-react deployed to 
                     pay.mitumba.africa/widget
  apps/docs       → documentation site
- Proposed npm package names: @mitumba/pay, @mitumba/pay-react, 
  @mitumba/pay-native

Stop here. Stanley will confirm or adjust each package name 
himself on npmjs.com, then bring back a one-time npm token to 
do the initial 0.0.0 publish of each — this bootstraps them on 
npm so a Trusted Publisher/OIDC connection can be attached 
afterward (OIDC can't attach to a package that doesn't exist).

Do not scaffold code, do not publish anything, and do not ask 
for a long-lived NPM_TOKEN to store as a secret — after the 
0.0.0 bootstrap, releases go through OIDC/provenance in CI with 
nothing stored.

─────────────────────────────────────
STEP 3 — SCAFFOLD (only after Stanley approves and hands over 
the one-time token)
─────────────────────────────────────

[same package specs as before — core/react/native, state 
machine, MitumbaPaySheet/Widget/Button — all built strictly 
against workers/pay/'s public contract, never its internals]

Set up CI + Changesets release with OIDC, mirrored from 
mitumba-ui. README, CONTRIBUTING, ARCHITECTURE, CLAUDE.md.

Keep talking through each decision with Stanley as you go, not 
just at the end of each step.
