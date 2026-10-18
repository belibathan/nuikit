---
"nuikit-core": minor
---

`lua/bridge.lua`: one player shape for Qbox, QBCore, ESX and standalone (health, armor, needs, money, job, gang, voice, dead), sent as `nuikit:player` only when it changes; `usePlayer()` in React. Server-wide theming: `theme.css` in the `nuikit` resource is applied to every nuikit UI. The UI now tells Lua when it's listening (`nuikit:ready`), so surfaces, player and theme sent before the page loaded aren't lost.
