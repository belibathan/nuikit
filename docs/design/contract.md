# Component contract

*The merge checklist for every registry component (`registry/nuikit/ui/*`) and hook, from design v2 §5B and
the research in [`../archive/design-research/system-architecture.md`](../archive/design-research/system-architecture.md) §4, adapted to nuikit's
tokens 1.1 ([`../tokens.md`](../tokens.md)) and the identities. A component that meets it renders correctly in
every identity, on every resolution, driven by mouse, keyboard or Lua, and can be upgraded by the people who
copied it.*

**CI** marks what a machine checks on every PR (`.github/workflows/ci.yml`). **CI (warn)** is reported but
doesn't fail. Everything else is a review item: the reviewer checks it against this page.

## Tokens and styling

1. **Colour only from tokens.** No hex/rgb/hsl/oklch literals, no palette classes (`bg-red-500`), no
   `oklch()`/`color-mix()` in inline styles (the Vite plugin lowers stylesheets only). Prefer a component token
   (`--nk-chip-bg`, `--nk-row-indicator-color`…) where one exists, then a semantic one (`bg-success`,
   `text-vital-health`, `text-hud-foreground`). Darken the game with `--scrim`, text on the game with
   `--world-foreground`. **CI**: `nuikit check` (`color/*`, on every shipped page and the synced copies in it);
   **CI (warn)**: class lint `no-restricted-classes` (palette classes, on the source).
2. **Anything a server might want different is a token**, a component token with the Graphite default as its
   `var()` fallback (`var(--nk-meter-radius, 9999px)`), so a theme from before tokens 1.1 still renders. Never a
   hard-coded look. Channels (`--x-rgb`, `--x-a`) stay inside `kit.css` and component tokens, never in TSX, so
   the Chromium 103 lowering can retire without touching components.
3. **rem, on the kit scale** (tokens 1.5, [default.md](default.md): `--nk-space-*`, `--nk-gap-*`, `--nk-r-{key,chip,control,surface}`,
   `--nk-h-{key,chip,control,row}`, `--nk-icon-*`, the type roles `.nk-scan` / `.nk-title` / `.nk-label` / `.nk-num` /
   `.nk-body`; primitives Tile, Fill, Chip, IconText, ActionBar and `.nk-plate` in `@layer nk.kit`; a theme writes into
   `@layer nk.theme`; **CI (warn)**: the Default rules in `nuikit check`, `nuikit rules` lists them). Spacing `--nk-space` steps (Tailwind `1 2 3 4 6`), text `--nk-text-*` (13 label,
   16 body, 18+ HUD values at 1080p). px only for hairlines (`--nk-border-width`), rings and shadow offsets.
   **CI (warn)**: class lint flags bare px arbitrary values (`w-[640px]`).
4. **Stock shadcn + `nk-*` only.** Compose vendored shadcn (`vendor/` is never edited) and the kit utilities;
   never redefine an `nk-*` name or add a local `@utility nk-*`. A new kit utility is a request to the lead
   (`kit.css`). **CI (warn)**: class lint `no-unknown-classes` (a misspelt or missing class).
5. **Every class list goes through `cn()`**, the kit-aware one (generated from `kit.css` into `lib/utils.ts`):
   a kit utility removes the earlier stock classes that set its colour or type, and one type style
   (`nk-title`/`nk-label`/`nk-caption`/`nk-display`), surface (`nk-panel`/`nk-hud`/`nk-chip`/`nk-slab`) or anchor
   wins per element. It doesn't merge radius, shadow or border yet (see the research's spike results), so
   **pick one surface in code** (the item-slot fix: `hud && (active ? "bg-primary text-primary-foreground" :
   "nk-hud")`) and **put the override after the class it overrides**. **CI**: `registry/nuikit/test/cn.test.ts`
   (the item-slot and countdown pairs, and every `lib/utils.ts` equals the generated one).

## API

6. **cva variants**, exported as `<name>Variants`, `defaultVariants` always set. Shared names: `size`
   (`sm`/`default`/`lg`, or a named scale like `hero` where the component needs one) and `tone`
   (`default`/`muted`/`destructive`/`success`/`warning`).
7. **Each size variant is self-contained**: it sets font size, leading and gap together, text-* before
   leading-*. tailwind-merge drops an earlier `leading-*` when a font size follows (the countdown bug, 4f50a95),
   so a base `leading-none` under a size variant is lost. **CI**: `cn.test.ts` pins that rule.
8. **Values come in pairs**: controlled `value` + `onValueChange` and uncontrolled `defaultValue`, so Lua can drive
   a value or leave it local.
9. **Composition over configuration**: sub-components for structure (`PanelHeader`, `MenuRowDetails`) and a
   `className` on each part. `asChild` only where the component wraps a Radix part (it spreads props and
   forwards the ref): Base UI (shadcn's default since July 2026) uses `render`, and keeping `asChild` at the edges
   keeps that move to the vendored layer.
10. **Props cover the intent it renders** (the intent table in [`../next/dispatch.md`](../next/dispatch.md)); no
    field of the intent is dropped.

## States

11. **Every state is reachable from props**, with no timer or hover needed for a screenshot: default, hover,
    focus-visible, active/selected, disabled, read-only, `inert` (Lua-driven highlight), loading or
    indeterminate, error/invalid, empty, and over-threshold where it applies. Each appears on `/components`.
12. **`data-slot`**: the root has `data-slot="<name>"`, each part `data-slot="<name>-<part>"`, and states are
    mirrored as `data-*` (`data-active`, `data-state`, `data-tone`), so themes, tests and baselines can target them.

## Motion (until the v2 §5A motion tokens land)

13. Durations are `var(--nk-time)` (`--nk-duration × --nk-motion`) and easing `var(--nk-ease-out)`. At
    `--nk-motion: 0` (theme, or the player's reduced-motion pref) nothing animates and any time-left line is
    hidden. Nothing animates on its own unless it's live (progress, timers, talking).
14. **Never animate `transform` on a centred element** (it overrides the translate that centres a dialog; Chromium
    103 has no separate `scale`/`translate` property). Gliding values (fills, needles) move by
    `transform: scaleX()/rotate()` on their own layer, never by `width` or a repaint (the `nk-slab-line` pattern).
15. **Keyboard and controller moves are instant**: no transition on focus or selection moves.

## Focus and input: mouse, keyboard, controller

16. Every interactive element works by keyboard: arrows move, Enter/Space act, Left/Right step. Escape goes through
    surfaces, never a local keydown that posts close. **CI**: `nuikit check` (`escape/adhoc`).
17. Focus is always visible (`focus-visible`, or the row indicator), and the highlight can be driven from Lua
    (`active` + `inert`) for controller focus CEF doesn't see as DOM focus. Under `inert`, hover changes nothing
    (CEF can keep `:hover` matched after focus moves).
18. Never calls focus natives; the surface or the owning resource does. **CI**: `nuikit check` (`focus/direct`).

## Accessibility

19. Meaning never by colour alone: icon + colour + value. Status uses `role="status"`/`alert`, progress
    `role="progressbar"` with its values.
20. Contrast of what it draws passes in every identity (the compiler checks token pairs; the component's own
    pairs are a review item until axe runs in the visual harness).
21. Reading text ≥ 16px (`--nk-text-base`), labels ≥ 13px, in every identity. Density never shrinks text.

## Engine and resolution

22. Nothing essential on `:has()` or `@container` (Chromium 103 ignores them), no post-103 API at runtime
    (`linear()` easing, runtime `color-mix`). **CI (warn)**: class lint flags `has-*` and `@*` variants.
23. **Screenshots in every identity**: Graphite, Signal, Velvet, Vector, and the Daylight flexibility check
    (`packages/core/test/themes/daylight.css`: light, roomy, round), at 1920×1080 for every state, plus 1280×720
    and 2560×1440 for the canonical state. Attach them to the PR and look at them.

## Shipping

24. **A `registry.json` entry** with accurate `dependencies` and `registryDependencies` (**CI**: `pnpm sync`
    fails on an undeclared `@/components/ui/*` import) and `meta` (below; **CI**: `registry-meta.test.ts`).
25. **A test file for any logic** (timing, formatting, thresholds, state precedence) in `registry/nuikit/test/`.
    **CI**: `pnpm test`.
26. **On `/components`** with all its states over a game scene.
27. **A changeset** naming the component when it changes for users. Copies in systems and overrides are
    `pnpm sync`ed, never edited. **CI**: the sync drift step.

## Registry metadata

Every `registry.json` item carries:

```json
"meta": { "since": "0.6.0", "status": "stable", "replaces": [], "removeIn": null }
```

| Field | Meaning |
|---|---|
| `since` | The release it first shipped in (`docs/releases/`), or `"unreleased"` until the release commit sets it |
| `status` | `stable`, `experimental` (API may change in a minor), or `deprecated` |
| `replaces` | Items this one supersedes (`notice` replaces `nui-toaster`) |
| `removeIn` | For a deprecated item, the release that may remove it; `null` otherwise |
| `replacedBy` | Deprecated items only: what to use instead |

The site's `/components` page shows the status and `since` next to each component. **CI**:
`registry/nuikit/test/registry-meta.test.ts` (every item has `meta`; a deprecated one has `replacedBy` and
`removeIn`; every `replaces` and `replacedBy` names a real item).

## Deprecation policy

1. **Deprecate, don't break.** A replaced component gets `status: "deprecated"`, `replacedBy`, `@deprecated`
   JSDoc naming the replacement (editors strike it through), and "Deprecated: use X. Still works." at the start of
   its registry description. It keeps working and keeps its tests.
2. **Two minor releases at least.** `removeIn` is at least two minors after the release that first ships the
   deprecation (deprecated in 0.6.0 → removable in 0.8.0). Nothing is removed in a patch.
3. **Say how to move.** The replacement's docs or the release notes show before/after markup; a mechanical
   change (a prop rename) gets a codemod or a find-and-replace line.
4. **Removal is announced.** The release that removes an item names it in `docs/releases/v<version>.md`, with the
   command to see what a copy differs by: `npx shadcn@latest add https://nuikit.vercel.app/r/<name>.json --diff`.
5. **Tokens are additive.** Renaming or removing a token is a tokens v2 change (`docs/tokens.md`), not a
   component deprecation.

Removed in 0.9.0: `key-hint` (→ `key-prompt`), `task-progress` (→ `meter` timed mode, `progress-ring`),
`nui-toaster` (→ `notice`, `<NuiNotices />` for NUI.notify()), all deprecated in 0.6.0.

## Follow-up: visual baselines (cheap version shipped, non-blocking)

`pnpm visual` (`bench/visual/run.mjs`) shoots the dev fixtures of `systems/nuikit_hud/web` and
`systems/nuikit_pause/web` plus four `/components` sections under Default, Neon Pop, Graphite, Flat and Square at
1920×1080 (animations off, reduced motion, fontsource fonts) in Chromium 103, the build `pnpm proof` uses
(`@sparticuz/chromium`; `VISUAL_CHROMIUM` overrides, `VISUAL_ONLY=hud,pause,components` narrows). Each shot is compared with
`bench/visual/baselines/ (local only, never committed)<page>-<theme>.png` by pixel ratio (default 1%, `VISUAL_MAX_DIFF`); `pnpm visual:update`
rewrites them. A missing baseline is written to `bench/visual/out/new-*.png` and reported, not failed; a diff over the
threshold fails the CI job `visual` (after `test`) and the `visual` artifact carries `actual-*` and `diff-*` PNGs. Baselines
are rendered by software GL in Chromium 103, so regenerate them with `pnpm visual:update` on Linux, not Windows.
The longer plan from the earlier spike follows.

Item 23 is a review item until CI compares screenshots. A spike on `feat/hardening` (commit 1553c7f, reverted
before merge; recover it with `git show 1553c7f`) built the harness and showed:

- **What it shot:** every registry section on `/components` (19) in Graphite, Signal, Velvet, Vector and Daylight
  at 1920×1080, via a `?identity=` param on the page: 95 PNGs, ~9 MB, Playwright 1.56.0.
- **Deterministic locally, by construction:** Playwright's clock paused before the first script and moved by a fixed
  `runFor` (countdowns, timed meters, enter timers land on the same frame), animations off, the stage photo hidden,
  bundled fonts. Two full runs matched; a 2px change to `nk-chip`'s padding failed `hud-chip` (4,454 px).
- **Why it isn't shipped:** baselines made outside CI's image may not match CI's renders (font rasterisation per
  environment), so the job could only run non-blocking; and every motion/identity change in flight would need new
  baselines each time.

To ship it: generate the baselines inside `mcr.microsoft.com/playwright:<version>-noble` (a CI run by hand that
uploads them), commit them, run the job blocking from then on. Then add Chromium 103 (puppeteer-core 15 path),
1280×720 and 2560×1440 for the canonical state, and axe (WCAG 2.1 AA tags) in the same harness. With baselines in
place, revisit the two `cn()` merges held back (shape/elevation, the leading rule): each would show as a diff.
