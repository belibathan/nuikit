---
"create-nuikit": minor
"nuikit-core": minor
---

Selection is the keycap Tile (tokens 1.7, `SELECTION_TOKENS`, docs/design/baseline.md "Selection"): no focus rings anywhere (focus renders the hover state; a text field keeps one caret rim), a lit row, menu item or tab is the primary keycap's face and wall (`--nk-tile-wall`, `--nk-tile-wall-shade`, `--nk-tile-radius`, `--nk-tile-key`, `--nk-tile-key-ink`, `--nk-tile-tint`, `--nk-tile-inset`), one `nk-indicator` per list slides between items by transform (sizes by FLIP), and lists (`nk-list`) space their rows by `--nk-list-gap` so a lit tile never touches a neighbour. The per-row hover fills, the row sweep and the marker are gone; `--nk-row-indicator` no longer changes rows.
