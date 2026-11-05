---
'@mitumba/pay': patch
---

Harden base URL normalization against ReDoS: strip trailing slashes with a
linear scan instead of a polynomial `/\/+$/` regex (CodeQL js/polynomial-redos).
Behavior is unchanged for all real base URLs.
