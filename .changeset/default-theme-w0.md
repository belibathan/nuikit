---
"nuikit-core": minor
"nuikit": minor
"create-nuikit": minor
---

Default W0 (docs/design/default.md): tokens 1.5. Kit levers every theme gets, with Graphite-equal defaults in kit.css: scales (`--nk-space-*`, `--nk-gap-*`, `--nk-r-{key,chip,control,surface}`, `--nk-h-*`, `--nk-icon-*`), five type roles (`--nk-type-{scan,title,label,num,body}-*`, `.nk-scan`, `.nk-body`), tile (`--nk-tile-*`), plate (`--nk-plate*`) and fill (`--nk-fill-*`) tokens, the motion ladder (`--nk-time-{snap,fast,slow}`, `--nk-exit-factor`, `--nk-time-reduced`, `--nk-lift`, `--nk-rise`, `--nk-land-scale`, `--nk-deny-x`), `--nk-row-indicator: sweep`, and the `--nk-treatment: tile` preset (Default's values). `--nk-hang-*` is removed. Cascade layers `nk.base, nk.kit, nk.theme, nk.app` (a theme writes into `nk.theme`); shadcn's Kbd is drawn as a Tile. Registry: new `tile`, `fill`, `chip`, `icon-text`, `action-bar`; `meter` gains `hue` and `threshold`, `edge-sheet` `back` and `anchor`, `empty-state` `tile`. `nuikit check` gains the Default rules (radius, blur, color-mix, soft shadows, motion, type, class-substring selectors, alert spellings, unlayered themes, off-scale spacing), all warnings for now.
