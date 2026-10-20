---
"nuikit-core": minor
---

Protocol v1 (docs/protocol.md). The ready handshake is versioned: the page sends `{ protocol, client }`, Lua answers with `protocol` and `capabilities` (`getHandshake()`, `protocolVersion()`, `hasCapability()`). `useNuiVisibility` sends Escape through `nuikit:escape` like any surface, so the topmost UI on the client gets it; `NUI.open({ escape })` sets what it does. The player payload no longer carries the bridge's internal `downed` field. New `scrim` token for darkening the game.
