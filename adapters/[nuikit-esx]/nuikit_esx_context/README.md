# nuikit_esx_context

**Replaces** esx_context's UI: `ESX.OpenContext` / `PreviewContext` / `CloseContext` / `RefreshContext` (the `Open` / `Preview` / `Close` / `Refresh` exports), drawn by nuikit's `menu` intent (`provide 'esx_context'`; `nuikit_adapter 'esx_context'` for `nuikit doctor`).
**server.cfg:** `ensure [nuikit-esx]` after `es_extended`, then `stop esx_context`.
**Stays with the library:** Nothing: esx_context is only UI. Input rows keep their values across Refresh; `onSelect` gets `menu.eles` with `inputValue`s.
**Spec and replay test:** `docs/adapters/esx-context.md`, `bench/adapters/replay/esx/`. Unproven in game (Oct 2026). Credit: @belibathan.
