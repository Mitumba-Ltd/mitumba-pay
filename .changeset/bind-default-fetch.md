---
'@mitumba/pay': patch
---

Call the default `fetch` on the global object. The client stored `globalThis.fetch` and called it as a method of itself, which browsers and Workers reject with `TypeError: Illegal invocation`, so every request without a custom `fetch` failed as a network error.
