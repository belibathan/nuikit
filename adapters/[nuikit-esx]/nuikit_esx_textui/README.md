# nuikit_esx_textui

**Replaces** esx_textui's UI: `ESX.TextUI(message, type)` / `ESX.HideUI()` and the two exports, drawn by nuikit's `prompt` intent (`provide 'esx_textui'`; `nuikit_adapter 'esx_textui'` for `nuikit doctor`).
**server.cfg:** `ensure [nuikit-esx]` after `es_extended`, then `stop esx_textui`.
**Stays with the library:** Nothing: esx_textui is only UI.
**Spec and replay test:** `docs/adapters/esx-textui.md`, `bench/adapters/replay/esx/`. Unproven in game (Oct 2026). Credit: @belibathan.
