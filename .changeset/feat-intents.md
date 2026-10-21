---
"nuikit-core": minor
---

Intents (docs/intents.md): the nine intent schemas (`packages/core/intents/*.json`) generate the TypeScript types and a Lua schema with LuaLS annotations. `nuikit-core/intents` exports `validateIntent`, the frame's `createIntentStore`, the wire types and the renderer module contract (`defineRenderer`, `rendererContext`); `nuikit-core/intents-react` exports `defineReactRenderer`. `@nuikit/init.lua` now loads `lib/intents.lua`: `nk.notify`, `nk.menu`, `nk.input`, `nk.confirm`, `nk.progress`, `nk.prompt`, `nk.target`, `nk.radial`, `nk.challenge`, validated at the call, yielding like `lib.*` or taking `{ cb = fn }`.
