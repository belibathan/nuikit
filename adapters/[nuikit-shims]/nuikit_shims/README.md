# nuikit_shims

**Replaces** old export names with nuikit intents by config: `exports['my_notify']:Notify(msg, type, ms)` becomes `nk.notify{…}` with no rewrite in the calling scripts.
**server.cfg:** `ensure [nuikit-shims]` after `nuikit`, then `stop` each original resource. Edit `config.lua` and add one `provide` per shimmed resource name in `fxmanifest.lua`.
**Spec:** `docs/adapters/shims.md`, tests `bench/adapters/replay/shims/`. Unproven in game (Oct 2026). Credit: @belibathan.
