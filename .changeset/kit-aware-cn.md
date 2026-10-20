---
"create-nuikit": patch
---

`cn()` knows the nk-* kit: `lib/utils.ts` is generated from `kit.css`, so a kit utility removes the earlier stock classes that set its colour or type (`text-hud-foreground` before `nk-chip-active` no longer wins), and one type style (`nk-title`, `nk-label`, `nk-caption`, `nk-display`), surface (`nk-panel`, `nk-hud`, `nk-chip`, `nk-slab`) or anchor (`nk-anchor-*`) applies per element. Layout, shape and shadows merge as before. Existing shadcn projects can take it from the registry: `npx shadcn add https://nuikit.vercel.app/r/utils.json`.
