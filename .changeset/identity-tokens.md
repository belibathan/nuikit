---
"nuikit-core": minor
"create-nuikit": minor
---

Identity tokens (tokens 1.1): type, shape, surface, density, motion and HUD style are tokens now, not just colour. `compileTheme` reads and derives `--brand`, `--font-display`, `--font-numeric`, `--nk-type-ratio`, the weights and tracking, `--nk-label-case`, `--nk-border-width`, `--nk-cut` (chamfered corners), `--nk-surface-opacity` / `-tint` / `-gradient` / `-edge`, `--nk-elevation`, `--nk-glow`, `--nk-density`, `--nk-ease`, `--nk-duration`, the HUD tokens and `--nk-row-indicator`, fills anything a theme leaves out (a plain TweakCN paste is the Graphite identity), and warns on floor violations (panel opacity under 0.92, HUD text over a white sky). Additive: every v1 name is unchanged. The kit utilities now read component tokens (`--nk-panel-*`, `--nk-row-*`, `--nk-key-*`, `--nk-chip-*`, `--nk-meter-*`, `--nk-gauge-*`, `--nk-heading-*`), each overridable in `theme.css`; new `nk-caption` utility. Four identities ship in `nuikit-core/themes` and the nuikit resource's `themes/`: Graphite (default), Signal, Velvet and Vector. Identity fonts (OFL, woff2) are bundled with every UI and served by the nuikit resource (`fonts/`).
