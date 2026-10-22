---
"create-nuikit": minor
---

Variants: `panel`, `menu-row` (and `MenuRowList`), `meter`, `key-prompt` and `notice` take `density` (compact, comfortable), `shape` (square, round) and `motion` (false, "reduced") for themselves and what's inside, over the theme's identity; `notice` gains `size` (sm, lg). They paint `data-nk-density` / `data-nk-shape` / `data-nk-motion`, which any element can carry: kit.css re-derives the density- and radius-dependent component tokens in that subtree. `nkVariant()` and `NkVariantProps` are in `lib/utils`.
