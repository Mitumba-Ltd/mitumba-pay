---
'@mitumba/pay-react': minor
'@mitumba/pay-native': minor
---

Unavailable methods show as greyed tabs.

- `MitumbaPayWidget` takes `unavailableMethods`: methods offered but not payable now (for example `['card']`). They render as disabled tabs labelled "<method>, temporarily unavailable" for assistive tech. A method in both `methods` and `unavailableMethods` is available.
- `MitumbaPaySessionSheet` follows the hosted checkout's phone layout: the logo, amount due, line items and total on green, then "Payment methods" with "Mobile payment" and "Card" tabs. Mobile payment shows the networks as chips, saved numbers, and an underlined number field with a validity mark. Card shows greyed while the session marks it `temporarily_unavailable`. The default `title` is now "Payment methods".
- New helpers `sessionMethodTabs(methods)` and `initialSessionMethod(methods, preferredNetwork)`.
- The sheets show the plain logo, without the white badge.
