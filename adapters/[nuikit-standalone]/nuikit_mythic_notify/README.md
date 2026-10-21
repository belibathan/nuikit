# nuikit_mythic_notify

**Replaces** mythic_notify's UI: `DoHudText`, `DoLongHudText`, `DoCustomHudText`, `SendAlert`, `PersistentAlert` and the two `mythic_notify:client:*` events, drawn by nuikit's `notify` intent (`provide 'mythic_notify'`; `nuikit_adapter 'mythic_notify'` for `nuikit doctor`).
**server.cfg:** `ensure [nuikit-standalone]` after `nuikit`, then `stop mythic_notify`.
**Stays with the library:** Nothing: mythic_notify is only UI. `style` reaches the renderer as `meta.style`.
**Spec and replay test:** `docs/adapters/mythic-notify.md`, `bench/adapters/replay/standalone/`. Unproven in game (Oct 2026). Credit: @belibathan.
