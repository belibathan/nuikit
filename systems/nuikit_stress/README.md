# nuikit_stress

Stress gameplay for Qbox and QBCore. On those frameworks the stress *rules* (speeding, shooting, screen blur, the `hud:server:GainStress` / `RelieveStress` events) live inside the HUD resource, so stopping `qbx_hud` or `qb-hud` turns stress off. Run this next to `nuikit_hud` to keep it.

- Same event names as `qbx_hud` / `qb-hud`: food, drinks, joints and other scripts that relieve or add stress keep working.
- Stores stress in the player's `stress` metadata, like the originals; `nuikit_hud` shows it.
- Exports for server scripts: `exports.nuikit_stress:AddStress(src, amount)`, `RelieveStress(src, amount)`.
- The two events come from the client, so a cheat can send them too: each player gets 10 per 10 s and can
  relieve at most 60 stress a minute through them (`Config.limits`). The exports aren't limited.
- Tune it in `config.lua`.

Not needed on ESX or standalone, and not needed if you keep `qbx_hud` running for its stress.
