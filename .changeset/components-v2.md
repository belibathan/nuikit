---
"create-nuikit": minor
"nuikit-ox-lib-ui": patch
---

Registry components read the design v2 component tokens (`--nk-panel-*`, `-row-*`, `-key-*`, `-chip-*`, `-meter-*`, `-gauge-*`, `-heading-*`, `-slab-*`) instead of fixed looks, so every identity restyles them without code changes.

- **Slabs:** `notice` has an item add/remove slab (icon tile, name, delta) whose changes to the same item merge within 1.5 s; `key-prompt` is the prompt slab (key chip + verb) by default, takes no keys and wraps with `wrap`; `meter` has `variant="slab"`, the timed-progress slab (label, thin line, cancel key) that succeeds `task-progress`; new `band` for full-width states (incapacitated).
- **Type:** countdown, money and stat heroes use `nk-display` in the numeric face; stat and meter labels use `nk-caption`.
- **countdown** drains its line on its own between updates. **speedometer** draws gauge tokens (fill, redline, ticks, track width, numerals).
- **form-field:** `DateField` has a picker that steps up to years and decades (as ox_lib's date row); date, range and time boxes size to their placeholder and digits; `TimeField` takes `icon` and `clearable`.
- **menu-row:** `muted` (and ox's greys, `dark.3`) colours an uncoloured bar quietly.

ox_lib's text UI uses key-prompt's no-keys and wrap. What scripts send and receive is unchanged.
