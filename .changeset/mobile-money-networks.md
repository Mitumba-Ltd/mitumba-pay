---
'@mitumba/pay-contract': minor
'@mitumba/pay': minor
'@mitumba/pay-react': minor
'@mitumba/pay-native': minor
---

Mobile money names the network the buyer pays from.

**Breaking:** a mobile-money method is now `{ type: 'mobile_money', network, phone }` for `initiateCheckout`, session attempts and saved methods, and the backend rejects one without a `network`. The payment prompt goes to that network only (an M-Pesa STK push is never sent for an Airtel number), and the network is never guessed from the number, because numbers move between networks. The backend still picks the provider that reaches the network.

- Contract: `Market.mobile_money_networks` (`MobileMoneyNetwork { id, name }`; read as `[]` from a backend without it); a session's mobile-money descriptors come one per network with `network`; `methodDescriptorKey` tells them apart; `mobileMoneyMethodSchema`; saved methods carry `network`; `network_not_offered` error code.
- `@mitumba/pay`: `savedPhoneChoices(methods, networks?)` returns each number's `network` and names the network beside a buyer's own label ("Work · Airtel Money ••• 222").
- `@mitumba/pay-react`: `MitumbaPayWidget` takes `networks` and `defaultNetwork`, asks "Pay from" before the number, and `onPay` sends `{ method: 'mobile_money', network, phone }` (`WidgetPayInput`). A saved number selects its network; an unavailable network shows as temporarily unavailable; with no networks, mobile money cannot be paid.
- `@mitumba/pay-native`: `MitumbaPaySheet` takes `networks` / `defaultNetwork` likewise (`NativePayInput`); `MitumbaPaySessionSheet` lists one method per network and sends its network. `sessionMethodFor`, `descriptorPhone`, `initialNetwork`, `isNetworkPayable` are exported.

Migrate: pass the market's `mobile_money_networks` to the widget or sheet, and forward `input.network` into the method you send.
