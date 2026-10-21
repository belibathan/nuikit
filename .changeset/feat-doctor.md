---
"nuikit-core": minor
---

`nuikit doctor` (docs/doctor.md): the server tells you what's left. `doctor(snapshot)` and `formatDoctor` in nuikit-core (pure, bundled into the nuikit resource's `server/compiler.js`); `systems/nuikit/server/doctor.js` builds the snapshot from FXServer natives. Reports the framework, which adapter packs fit, every UI resource's status (on nuikit, hosted, adapted, override, untouched), conflicts (provide vs library, override missing or changed, newer protocol, start order, missing `dependency 'nuikit'`, theme contrast, newer release via `nuikit_latest`) with a next step each, and live `nuikit:intent` counts by source. `nuikit doctor json` for machines; `exports.nuikit:doctor()`.
