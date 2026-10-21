# nuikit_esx_notify

**Replaces** esx_notify's UI: `ESX.ShowNotification`, `exports['esx_notify']:Notify(...)` and the `esx:showNotification` server event, drawn by nuikit's `notify` intent (`provide 'esx_notify'`; `nuikit_adapter 'esx_notify'` for `nuikit doctor`).
**server.cfg:** `ensure [nuikit-esx]` after `es_extended`, then `stop esx_notify` (or delete it).
**Stays with the library:** Nothing: esx_notify is only UI. `ShowAdvancedNotification` / `ShowHelpNotification` stay native in es_extended (`setr nuikit_esx_notify_advanced 1` also draws the advanced one as a toast).
**Spec and replay test:** `docs/adapters/esx-notify.md`, `bench/adapters/replay/esx/`. Unproven in game (Oct 2026). Credit: @belibathan.
