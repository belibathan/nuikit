# nuikit_qb_radialmenu

Replaces **qb-radialmenu** (stop it). Paste your `Config.MenuItems` / `Config.JobInteractions` into `config.lua` (same shape); F1 (rebindable, `nuikit_radial`) opens nuikit's radial renderer; `AddOption` / `RemoveOption` work as before; items dispatch by `type` and respect `shouldClose`.

server.cfg: `ensure [nuikit-qb]`; `stop qb-radialmenu`.

**Not translated (owner's call):** vehicle doors, extras, seats and trunk classes, which qb-radialmenu did as gameplay. Spec: `docs/adapters/qb-radialmenu.md`.
