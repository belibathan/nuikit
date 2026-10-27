---
"nuikit-core": patch
"create-nuikit": patch
---

Lua follows fivem-foundation. The runtime gains `nk.log` (`info`, `success`, `warn`, `error`, `debug`: colour + `[nuikit:<resource>]` + text + `^7`) and `nk.json` (`decode` with one return value and a reason, `encode` that never throws); every console line of the runtime goes through them. Templates ship the foundation's helpers (`helpers/log.lua`, `wait.lua`, `rate_limiter.lua`, `sanitize.lua`, `json_safe.lua`, `server_id.lua`): an unreadable save file stops the resource instead of being emptied by the next save, admin commands refuse a player id that is not a whole number, and every manifest has `use_fxv2_oal 'yes'`.
