---
'@mitumba/pay-react': patch
---

`openMitumbaPay` now opens the hosted widget at `?session=<session_id>`, matching the session's `hosted_url`, so the widget starts in session mode directly. The client secret is still passed only through the INIT message.
