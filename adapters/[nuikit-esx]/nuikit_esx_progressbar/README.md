# nuikit_esx_progressbar

**Replaces** esx_progressbar's UI: `ESX.Progressbar(text, length, options)` / `ESX.CancelProgressbar()` and the exports; FreezePlayer and the animation run here as before, drawn by nuikit's `progress` intent (`provide 'esx_progressbar'`; `nuikit_adapter 'esx_progressbar'` for `nuikit doctor`).
**server.cfg:** `ensure [nuikit-esx]` after `es_extended`, then `stop esx_progressbar`.
**Stays with the library:** Nothing. A second bar while one runs gets its `onCancel` (the library's own behaviour is undocumented).
**Spec and replay test:** `docs/adapters/esx-progressbar.md`, `bench/adapters/replay/esx/`. Unproven in game (Oct 2026). Credit: @belibathan.
