---
"create-nuikit": patch
---

Every block template on the v2 components and component tokens: money through `Money` / `formatMoney`, empty states through `EmptyState`, read-only rows (settings key hints, scoreboard activities, bank transactions) through `MenuRow readOnly`, the pause player card through `PlayerCard`, the pause and loading titles and the loading percent on the identity's display face (`nk-display`, `Stat size="display"`), captions on `nk-caption`, the death screen as text on the game (`nk-on-game`, no infinite pulse), the interaction options in a `Panel` with the hint as a `HudChip`, no width animations or raw durations. What each block sends to Lua is unchanged; the templates' server rules still pass their Lua 5.4 specs. Stills: `bank` takes `dialog`, `job-menu` takes `firing`.
