# nuikit_esx_menu_dialog

**Replaces** esx_menu_dialog's UI: the `dialog` type of `ESX.UI.Menu`: a one-field text form; `submit` gets `data.value` as a string, drawn by nuikit's `input` intent (`provide 'esx_menu_dialog'`; `nuikit_adapter 'esx_menu_dialog'` for `nuikit doctor`).
**server.cfg:** `ensure [nuikit-esx]` after `es_extended`, then `stop esx_menu_dialog`.
**Stays with the library:** es_extended's `ESX.UI.Menu` itself.
**Spec and replay test:** `docs/adapters/esx-menu-dialog.md`, `bench/adapters/replay/esx/`. Unproven in game (Oct 2026). Credit: @belibathan.
