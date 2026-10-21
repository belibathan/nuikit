# nuikit_qb_target (recorder stage)

Replaces nothing yet. qb-target's option list is render-only (its page), and that page can only be written from a recorded message log, which doesn't exist. This resource records: for one session copy `override/html/index.html` over qb-target's page, aim at a few things, run `/nuikit_qb_target dump`, paste the lines into `docs/adapters/qb-target.md`, put the original page back (targeting is blind while the recorder is in).

server.cfg: `ensure [nuikit-qb]` (harmless when idle: it only registers a callback and a command).

Spec: `docs/adapters/qb-target.md`.
