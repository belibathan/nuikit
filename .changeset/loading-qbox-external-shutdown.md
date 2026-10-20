---
"nuikit-loading-web": patch
---

nuikit_loading: **On Qbox the loading screen now stays up until the character menu appears.** Before, it closed as soon as the game had loaded, so players saw the world while `qbx_core` set up its character selection. `Config.externalShutdown` now defaults to `'auto'`: when `qbx_core` runs with its own character menu, the screen shows "Ready" until `qbx_core` closes it. That menu is on unless `characters.useExternalCharacters = true` is set in `qbx_core/config/client.lua`. Everywhere else it still closes right away. `true` and `false` still force either behaviour.
