---
"nuikit-core": minor
"nuikit": patch
"create-nuikit": patch
---

Design levers (roadmap Track D). `docs/design/levers.md` catalogs every visual decision, its lever, default, range and treatment, and the gaps. Two new shipped themes built from values only: `themes/flat.css` (flat, rounded, upright, soft fills) and `themes/square.css` (zero radius, 1px rims, mono numerals, high contrast). New lever `--nk-tile-key-rim` (the keycap face's rim; `transparent` by default, so nothing shipped changes). Themes set values only, enforced: a core test over `themes/*.css`, and `nuikit check` warns `theme/values-only` on a selector or a non-token declaration in `theme.css` / `themes/*.css`.
