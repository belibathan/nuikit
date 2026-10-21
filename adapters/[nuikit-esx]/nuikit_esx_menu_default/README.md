# nuikit_esx_menu_default

**Replaces** esx_menu_default's UI: the `default` type of `ESX.UI.Menu` (registered with `ESX.UI.Menu.RegisterType`): title, elements, sliders and option lists, submit / cancel / change, menu.setElements and friends, drawn by nuikit's `menu` intent (`provide 'esx_menu_default'`; `nuikit_adapter 'esx_menu_default'` for `nuikit doctor`).
**server.cfg:** `ensure [nuikit-esx]` after `es_extended`, then `stop esx_menu_default`.
**Stays with the library:** es_extended's `ESX.UI.Menu` itself (Open, Close, IsOpen… and the menu object).
**Spec and replay test:** `docs/adapters/esx-menu-default.md`, `bench/adapters/replay/esx/`. Unproven in game (Oct 2026). Credit: @belibathan.
