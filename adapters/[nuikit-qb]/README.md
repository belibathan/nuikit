# [nuikit-qb]: the QBCore adapter pack

Seven resources, one per library, each landing that library's public API on nuikit's intents
(`docs/adapters/qb-*.md`, clean-room). `ensure [nuikit-qb]` after `exec @nuikit/nuikit.cfg`, then stop
what each README says (`qb-menu`, `qb-input`, `progressbar`, `qb-radialmenu`); qb-core stays.
Stand-ins: `nuikit_qb_menu`, `nuikit_qb_input`, `nuikit_qb_progressbar`, `nuikit_qb_radialmenu`. Listeners on qb-core:
`nuikit_qb_notify`, `nuikit_qb_drawtext` (+ an optional silencer page for qb-core's html). Recorder only: `nuikit_qb_target`.
Replay tests: `node --test bench/adapters/replay/qb/*.test.mjs`. Nothing here has run in game yet (`docs/adapters/README.md` has the checklists).
