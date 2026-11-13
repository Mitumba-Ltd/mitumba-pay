---
'@mitumba/pay-react': patch
---

`openMitumbaPay` keeps the store page visible behind the checkout. The frame uses the widget's light color scheme, so the browser no longer paints it opaque on a dark-scheme page. The overlay is a dimmed, blurred scrim that fades in, with no fade under reduced motion.
