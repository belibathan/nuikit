# nuikit_qb_progressbar

Replaces **progressbar** (stop it; `QBCore.Functions.Progressbar` lands here through its export). `Progress`, `ProgressWithStartEvent`, `ProgressWithTickEvent`, `isDoingSomething` draw with nuikit's progress renderer; `finish(cancelled)` / `onFinish` / `onCancel` fire as before; X cancels a `canCancel` bar.

server.cfg: `ensure [nuikit-qb]`; `stop progressbar`.

Kept in Lua here (client/effects.lua): animation or scenario, props, control disabling. A second bar while one runs gets `finish(true)` at once (undocumented in progressbar). Spec: `docs/adapters/qb-progressbar.md`.
