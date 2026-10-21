---
"nuikit-core": minor
---

- `compileTheme` warns on an empty token (`--primary: ;`) and on an alias that resolves to nothing (`var(--nope)`, or an alias to an empty token); the stock value is used (or the token is left out of a patch), and `var(--x, fallback)` pointing at such a token takes its fallback, as in CSS.
- Runtime context: the server's currency and locale (`nuikit_currency`, `nuikit_locale` convars) reach every page that uses the bridge as `nuikit:context`; `getContext()` / `onContext()` and `useNuiContext()` expose `{ currency, locale }`, and `Money` formats with them by default.
- Host: a module's queued messages are delivered only once its listeners are attached (`defineReactModule` signals after the first commit's effects), so nothing sent between mount and the first `onNui` is dropped.
