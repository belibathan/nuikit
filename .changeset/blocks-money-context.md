---
"create-nuikit": patch
---

Blocks format money in text (titles, confirms, the HUD wallet) with `useFormatMoney()` from `money`: the server's currency and locale from `useNuiContext()`, re-rendering when `nuikit:context` arrives after the first frame.
