---
'@mitumba/pay': patch
'@mitumba/pay-react': patch
'@mitumba/pay-native': patch
---

`PayError.message` is a plain buyer-facing sentence for documented error codes when the response carries no message, instead of the code itself (for example `order_not_payable`). `code` is unchanged. The messages are exported as `PAY_ERROR_MESSAGES`.
