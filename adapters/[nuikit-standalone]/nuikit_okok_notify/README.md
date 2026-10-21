# nuikit_okok_notify

**Replaces** okokNotify's UI: `exports['okokNotify']:Alert(title, message, time, type, playSound)` and the `okokNotify:Alert` client event, drawn by nuikit's `notify` intent (`provide 'okokNotify'`; `nuikit_adapter 'okokNotify'` for `nuikit doctor`).
**server.cfg:** `ensure [nuikit-standalone]` after `nuikit`, then `stop okokNotify`.
**Stays with the library:** Nothing: okokNotify is only UI. `phone` / `neutral` draw as info with `meta.kind`; no sound is played yet.
**Spec and replay test:** `docs/adapters/okok-notify.md`, `bench/adapters/replay/standalone/`. Unproven in game (Oct 2026). Credit: @belibathan.
