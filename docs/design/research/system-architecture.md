# What makes a design system last: nuikit against best practice

*Research, Oct 20 2026 (Design lane). Question: which architecture and engineering practices make a design
system worth maintaining, building on and using for years, and where does nuikit stand? Read with
`docs/architecture.md`, `docs/design/v2.md`, `docs/tokens.md` (the `feat/identity` revision) and
`docs/next/dispatch.md`.*

**Tags.** **[V]** verified in this repo (file or command named). **[R]** from a cited external source
(listed at the end). **[I]** inference or judgement: it would change if the evidence did.

---

## 0. The short answer

Systems that last years share five properties. Each needs one mechanism that keeps it true without anyone
having to remember it:

| Property | Mechanism in lasting systems | nuikit today |
|---|---|---|
| One source of truth per decision | Token files with a schema; generated outputs | Strong: compiler, DTCG file, schema, `pnpm sync` [V] |
| Components agree on a contract | A written checklist enforced by tests and lint | Bar exists but is scattered (dispatch.md); partly enforced [V] |
| Changes are visible before they ship | Visual regression on every PR, per theme | Screenshots are taken but never compared [V] |
| Consumers can upgrade | Versions, deprecations with dates, codemods, diff tooling | Deprecations are text in descriptions; no versions [V] |
| Many contributors stay consistent | Lint rules that encode the rules, not docs | `nuikit check` covers colour and protocol; nothing checks class strings [V] |

nuikit is unusually strong on the first property and on runtime theming. The highest risks sit in the
other four, and most of them are cheap to fix.

---

## 1. What nuikit already does well

1. **Tokens have a real pipeline.** [V] `compileTheme` takes any shadcn / TweakCN paste, DTCG or plain object.
   It lowers colours to Chromium 103, derives the missing semantics (success, warning, vitals, brand),
   checks contrast with pass/fail sentences, and publishes once through GlobalState to every UI, live
   (`docs/tokens.md`, "The compiler", "Distribution"). That is the job Style Dictionary and Terrazzo do at
   build time [R: Terrazzo DTCG guide; DTCG 2025.10]. nuikit also does it at runtime, which a game server
   needs because the owner pastes the theme after the UIs are built. [I] A generic token tool would add
   little here: there is one platform (CSS in CEF), and the runtime compile is the product.
2. **It speaks the token standard.** [V] `nuikit.tokens.json` is DTCG 2025.10, with `toDtcg`/`parseDtcg`, a JSON
   Schema, and an explicit mapping for keywords (`$extensions["dev.nuikit"].type: "keyword"`, because DTCG
   has no string type). DTCG 2025.10 is the first stable version, and Figma, Style Dictionary, Tokens Studio
   and Terrazzo implement it [R: W3C announcement]. So nuikit is already interoperable.
3. **Three token tiers, with fallbacks.** [V] Identity → semantic → component (`docs/design/v2.md` §1;
   tokens.md "Component tokens 1.1"). Components read only component tokens, and every `var()` carries the
   Graphite default as its fallback, so older themes still render. This is the structure Radix Themes
   exposes as `accentColor`/`grayColor`/`radius`/`scaling`/`panelBackground` [R: Radix Theme docs]. nuikit's
   identity layer goes further, adding density, cut, elevation, surface, motion and HUD qualities. [I]
4. **It proves the theming is flexible, not just theoretical.** [V] `daylight.css` plus `identity.test.ts`
   assert that a light, roomy, round theme compiles cleanly, that every quality differs from Graphite, and
   that every kit fallback equals the compiled default. Most systems never test that their theming can
   actually leave the default. The test also found a real bug: text drawn on the game shared `--foreground`
   with text on panels, which is why `--world-foreground` now exists.
5. **It builds on shadcn's distribution model.** [V] The registry (`registry.json`, `$schema` shadcn,
   `npx shadcn add …/r/<name>.json`) holds compositions of unmodified, vendored shadcn
   (`vendor/shadcn/README.md`: "Don't edit them here; re-copy from upstream"). Users own the code, while
   nuikit owns only a thin layer. Every component uses `cva`, and most carry `data-slot` (per-file counts:
   e.g. `meter` 21, `form-field` 16).
6. **Protocol conformance is graded in CI.** [V] `nuikit check` (`packages/cli/src/check.ts`) lints hardcoded
   colours, palette classes, direct focus natives, ad hoc Escape and per-frame sends. It grades each UI at
   levels 0–3, and CI holds every shipped page at level 3 (`.github/workflows/ci.yml`). That is a design
   system lint rule set with teeth.
7. **It renders in the real engine.** [V] The `chromium-103` CI job renders stock and lowered CSS in an actual
   Chromium 103 (`@sparticuz/chromium@103.0.0`, `examples/cef-proof`). Few systems test in their real
   runtime engine, and nuikit has the binary in CI already.
8. **Deprecations keep working.** [V] `key-hint`, `task-progress` and `nui-toaster` carry `@deprecated` JSDoc
   naming their replacements, plus "Deprecated: use … Still works." in the registry description.
9. **Components are reproducible.** [V] The dispatch bar requires every state to be reachable from props
   (for screenshots and the site). Logic has unit tests (14 files in `registry/nuikit/test/`), and the
   countdown fix added a regression test that merges every size through `cn()`.
10. **There are rules for parallel agents.** [V] Lanes, file ownership, a request channel and append-only
    shared files (`dispatch.md`) prevent the commonest multi-contributor failure: two people editing the same
    primitive differently.

---

## 2. Gaps, ranked by risk

Risk = likelihood × blast radius × how late it is noticed.

| # | Gap | Evidence | Risk |
|---|---|---|---|
| 1 | **`cn()` doesn't know the kit.** Every synced `lib/utils.ts` is a bare `twMerge(clsx(…))`. tailwind-merge resolves conflicts only between classes it can classify. `nk-*` utilities are invisible to it, so a conflicting stock class survives next to them (item-slot: `nk-chip-active` + `text-hud-foreground`, white on white). Meanwhile known groups conflict in ways authors don't expect (countdown: a font-size dropped the base `leading-none`). | [V] commits `86cf7cd`, `4f50a95`; roadmap "Lead backlog"; [R] tailwind-merge issue #368 (runtime merge can't read build config; fix is `extendTailwindMerge`) | **High.** It has happened twice, it fails silently, it only shows in specific identities or states, and every consumer inherits it. |
| 2 | **No visual regression gate.** `bench/identity/shots.mjs` (feat/identity) produces 4 identities × 3 resolutions of shipped screens, and `cef-proof` uploads PNGs. Nothing compares them with a baseline or fails a PR. "Look at the screenshots" depends on a human or agent remembering. | [V] `ci.yml` (artifact upload only); `shots.mjs` header | **High.** v2 multiplies the surface (4 identities + daylight × states × 3 resolutions), and token formula changes ripple everywhere. |
| 3 | **Synced copies have no drift check.** Copies are committed and "never edited by hand", but CI never runs `pnpm sync` and diffs. A hand edit, or a forgotten sync after a source change, ships unnoticed. | [V] `ci.yml`, root `package.json` scripts | **High–medium.** This is the cheapest gap to close and a classic multi-agent hazard. |
| 4 | **The component contract isn't one document, and isn't machine-checked.** The bar lives in a paragraph of `dispatch.md` ("tokens only; rem not px; every state reachable…"). Nothing verifies `data-slot`, motion, size-variant self-containment or the identity screenshots per component. | [V] dispatch.md "Lane: Components" | **Medium–high.** Agents follow what's checked. Unchecked rules decay first. |
| 5 | **Class strings aren't linted.** The repo has no ESLint or Biome config. `nuikit check` doesn't flag unknown classes, conflicting pairs, `px` arbitrary values, `nk-*` redefinitions or banned utilities (individual `scale`/`translate`). | [V] no lint config in `package.json` files; RULES list | **Medium.** Hard rules in CLAUDE.md are enforced by memory. |
| 6 | **No versioning or update path for registry consumers.** The shadcn registry item schema has no `version` or `deprecated` field (only free-form `meta`). nuikit adds nothing, so a server developer who installed `menu-row` in 0.5 can't tell what changed or whether to update. shadcn's answer is `add --diff` / `--view` / `--dry-run` and `migrate` codemods. nuikit documents none of them. | [R] registry-item.json schema; shadcnstudio "how to update"; [V] registry.json has no `meta` | **Medium.** It grows with adoption: this is the copy-paste model's known cost. |
| 7 | **Radix → Base UI drift upstream.** shadcn made Base UI the default for new projects on 3 July 2026 (Radix still supported). Base UI uses `render` instead of `asChild`, and `data-open` instead of `data-[state=open]`. nuikit vendors Radix new-york-v4 and its components use `Slot` from `radix-ui`. A future "re-copy from upstream" or a user's `shadcn init` may land on the other primitive set. | [R] OpenReplay article; Base UI 1.0.0 (Dec 11 2025); [V] `menu-row.tsx` imports `Slot` | **Medium, slow.** No break today, but a fork in the road within the 0.8–1.0 horizon. |
| 8 | **No automated accessibility checks.** Nothing runs axe, and controller/keyboard focus behaviour is tested only by hand. CEF players rarely use screen readers [I], but keyboard and controller navigation, focus visibility and contrast are core in game. | [V] no axe dependency; [R] Playwright a11y docs (automated checks find only some issues) | **Medium.** |
| 9 | **The Figma ↔ code sync is manual.** `v2.md` step 4 wants each identity as a variable mode mirroring `nuikit.tokens.json` 1:1. The tokens file holds only the default theme, and identities exist only as CSS. The Figma Variables REST API is Enterprise-only. Native DTCG import/export exists. | [V] tokens.md ("the default theme as a DTCG file"); [R] Figma REST docs; Schema 2025 TLDR | **Low–medium.** Drift is visible, and only the design file suffers. |
| 10 | **Chromium 103 lowering is a second compiler to maintain** (see §5.3). | [V] `packages/vite`; CLAUDE.md hard rules | **Medium, long horizon.** |

---

## 3. Concrete adoptions

Effort: S ≤ half a day, M ≤ 2 days, L ≈ a week. Payoff: what stops happening.

### 3.1 A `cn()` configured for the kit: **S, payoff high** (closes gap 1)

tailwind-merge runs at runtime and can't read the CSS config. Custom classes must be registered with
`extendTailwindMerge`, and conflicts must be declared with `conflictingClassGroups` [R: tailwind-merge
configuration v2.0 docs, issue #368]. Generate the config from `kit.css`, so it can't drift:

```ts
// packages/create-nuikit/kit-merge.ts (generated by pnpm sync from kit.css; synced into every lib/utils.ts)
import { extendTailwindMerge } from "tailwind-merge"
export const twMerge = extendTailwindMerge<"nk-surface" | "nk-type" | "nk-row" | "nk-chip-state" | "nk-anchor">({
  extend: {
    classGroups: {
      "nk-surface": ["nk-panel", "nk-hud", "nk-chip", "nk-slab", "nk-slab-band"],
      "nk-type": ["nk-title", "nk-label", "nk-caption", "nk-display", "nk-num"],
      "nk-chip-state": ["nk-chip-active"],
      "nk-anchor": [{ "nk-anchor": ["tl", "tr", "bl", "br", "t", "b", "l", "r"] }],
    },
    conflictingClassGroups: {
      // a kit type style sets size, leading, weight, tracking, case: later stock classes of those groups win,
      // and a later kit type style removes them
      "nk-type": ["font-size", "leading", "font-weight", "tracking", "text-transform", "font-family"],
      // the kit surfaces set background and text colour
      "nk-surface": ["bg-color", "text-color"],
      "nk-chip-state": ["bg-color", "text-color"],
    },
  },
})
```

- Each conflict list is declared next to the `@utility` in `kit.css` (for example
  `/* @merge nk-type: font-size leading … */`), and `pnpm sync` turns it into the config. [I]
- A test merges every pair (`nk-title text-sm`, `nk-chip-active text-hud-foreground`, `text-xl leading-none`)
  and asserts the result. The countdown test is the seed. [V]
- Rule for authors, in the contract: **a size variant sets every property it depends on** (the countdown fix
  already does this), and a component never puts two surface classes in one `cn()` call: it picks one (the
  item-slot fix). [V]
- `tailwind-variants` takes a `twMergeConfig`, cva takes none. With cva, the config lives in `cn()`, which is
  where shadcn components already route classes. [R: tailwind-variants docs; I]

### 3.2 Keep cva; adopt the slot discipline, not a new library: **S, payoff medium**

`tailwind-variants` adds slots and `compoundSlots` for multi-part components [R: tailwind-variants slots].
nuikit's multi-part components (`panel`, `meter`, `menu-row`, `vital`) would read better with slots, but
switching diverges from stock shadcn, which uses cva, and from every user's existing copy. [I] Adopt the
pattern instead:

- one exported `*Variants` per part (`panelVariants`, `panelHeaderVariants`), each with
  `VariantProps`-typed props;
- `size` and `tone` names shared across components (`sm`/`default`/`lg`; `default`/`muted`/`destructive`/
  `success`/`warning`);
- `defaultVariants` always set.

[V] Most components already export one cva. Several don't (`speedometer`, `radial-menu`, `player-card`).

### 3.3 Visual regression in CI across identities: **M, payoff high** (closes gap 2)

- **Engine.** Use Playwright `toHaveScreenshot` with committed baselines. Screenshots differ across OS, fonts
  and GPUs, so run the baselines in one pinned container and tolerate small diffs (`maxDiffPixelRatio`), with
  animations disabled [R: Playwright visual comparison guides]. nuikit already ships fonts as woff2 [V], which
  removes the largest source of noise.
- **What to shoot.** One route per component on the site (`/components/<name>?state=…`). Every state is already
  reachable from props [V]. The axes are 4 identities + daylight × 3 resolutions. Start at 1920×1080 for every
  state, plus 1280×720 and 2560×1440 for one canonical state, so the matrix stays reviewable. [I]
- **Where.** Run the screenshots in the `cef-proof` Chromium 103 binary (CI already has it [V]), not a modern
  Chromium. That makes the baseline the player's engine. Playwright needs CDP to drive it; puppeteer-core 15
  already does [V], so pixelmatch on puppeteer screenshots is the fallback if Playwright can't attach to 103.
  [I: unproven, spike first]
- **Review.** For hosted review, Lost Pixel's OSS mode runs in your own CI on custom Playwright shots, and its
  platform is free for non-commercial OSS on request [R]. Chromatic's free tier allows 5,000 snapshots a month,
  Chrome only [R]. 5 identities × ~40 component states already passes 200 per build, so a busy month could
  exceed that. [I] Recommendation: in-repo baselines first, Lost Pixel only if review UX becomes the
  bottleneck.

### 3.4 Sync drift gate: **S, payoff high** (closes gap 3)

A CI step runs `pnpm sync && git diff --exit-code -- systems addons packages/create-nuikit/template
apps/www`. A failure prints which source to edit. The sync script already keeps a manifest of what it writes
(commit `db489c8`) [V], so it can also check that no unlisted file sits in a synced folder.

### 3.5 Component contract doc + `nuikit check --components`: **M, payoff high** (closes gap 4)

Write §4 as `docs/design/component-contract.md`. Make the mechanical items checks in `packages/cli`, run on
`registry/nuikit/ui`: a root `data-slot`, an exported `*Variants`, no `px` outside comments and hairlines, no
inline `color-mix`/`oklch`, no `transform` animation on a centred element, an entry on `/components`, and a
test file when the component has logic. A component that passes gets `"meta": { "contract": 1 }` in
`registry.json` (see 3.7).

### 3.6 Lint rules enforcing tokens and the kit: **S–M, payoff medium** (closes gap 5)

`eslint-plugin-better-tailwindcss` supports Tailwind v4 through `entryPoint` (the CSS file) and has these rules
[R]:

- `no-unknown-classes`, with `detectComponentClasses` and `ignore` patterns;
- `no-conflicting-classes` (Tailwind v4 only): it would have caught both merge bugs at author time;
- `no-restricted-classes`: bans with autofix;
- `enforce-canonical-classes`.

Configure:

- `entryPoint`: a synced `web/src/index.css`, so `nk-*` and the token classes (`bg-success`,
  `text-vital-health`) are known;
- `no-restricted-classes`: palette colours (already in `nuikit check`), `scale-*`/`translate-*`, which compile
  to the individual properties CLAUDE.md bans [I: confirm against the v4 output], arbitrary `[..px]` values,
  `has-*` and `@container` variants for anything essential;
- a tiny custom rule: no local `@utility nk-*` outside `kit.css`.

Keep `nuikit check` for protocol, Lua and colour literals, and let ESLint own class strings. Each tool then has
one job. [I]

### 3.7 Deprecation and versioning policy for registry items: **S, payoff medium, growing** (closes gap 6)

shadcn's schema allows free-form `meta` [R]. Use it consistently:

```json
"meta": { "since": "0.5.0", "contract": 1, "status": "deprecated",
          "replacedBy": "key-prompt", "removeIn": "0.9.0", "migration": "docs/migrations/key-hint.md" }
```

- **Policy.** A deprecated item keeps working for at least two minor releases, which is today's practice
  written down. It keeps `@deprecated` JSDoc (editors strike it through). It gets a migration note with
  before/after markup, like MUI's deprecation guide, plus a codemod when the change is mechanical (prop
  renames) [R: MUI]. Removal happens in a release whose notes name it.
- **The site** shows `since` / `status` badges on `/components`, and `registry:build` fails if a deprecated item
  lacks `replacedBy`.
- **Changelog per item.** Every changeset that touches `registry/nuikit/ui/<x>.tsx` names `<x>`. The release
  script collects them into `docs/releases/v<ver>.md` under "Components changed", with the command to review
  each: `npx shadcn@latest add <url> --diff` [R: shadcnstudio]. Users then see exactly what to pull.

### 3.8 Token → Figma sync: **M, payoff medium** (closes gap 9)

- Emit one DTCG file per identity from `packages/core/themes/*.css` (compile, then `toDtcg`). That gives
  `nuikit.<identity>.tokens.json` beside the default. A DTCG resolver or `$extensions` mode map is the
  standards route for modes [R: DTCG 2025.10 supports theming and modes; I: check the resolver module's
  status].
- **Into Figma.** Native variable import uses DTCG and needs no Enterprise plan [R: Schema 2025 TLDR]. Import
  each identity as a mode of one collection. The REST Variables API is Enterprise-only (full seat) [R: Figma
  developer docs]. The plugin API, which the Figma MCP's `use_figma` drives, is the automatable route on other
  plans. [I]
- **Drift check.** Export the Figma collection back to DTCG, diff it against the repo file in a script, and
  report. Run it by hand or on a schedule. CI can't open Figma. [I]
- Tokens Studio's Git sync of multi-file token sets is a Pro feature [R]. It's not needed, since nuikit's
  tokens are code-first. [I]

### 3.9 Accessibility checks in the same harness: **S on top of 3.3, payoff medium** (closes gap 8)

- On every component route, run `AxeBuilder` with `withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])` in a
  shared fixture [R: Playwright accessibility testing]. Disable rules that don't apply to a game overlay, such
  as landmarks and document title, with `disableRules`, not `exclude` [R].
- Add a keyboard/controller script per interactive component: Tab/arrows/Enter/Space/Escape move and act as the
  contract says, and focus is always visible. Automated checks catch only part of the problems, so keep the
  in-game owner test [R].
- Contrast is already checked in the compiler for token pairs [V]. axe adds the pairs a component actually
  draws.

### 3.10 Prepare for Base UI without moving: **S now, M later** (gap 7)

- Pin the decision in `vendor/shadcn/README.md`: nuikit stays on Radix new-york-v4 until a spike shows Base UI
  works on Chromium 103 (popup positioning, `inert`, focus). Re-copies come from the Radix variant only. [I]
- Keep `asChild` out of new nuikit component APIs unless the component wraps a Radix part. Prefer composition
  (children and sub-components), so a later move to `render` touches only the vendored layer. [I]
- shadcn ships `migrate` codemods (including `radix`) [R]. Watch for one in the other direction.

---

## 4. Proposed component contract (v1)

Every `registry/nuikit/ui/*` component meets this before merge. Items marked ⚙ are checkable by machine
(3.5/3.6) and become CI gates. The rest are review items.

**Tokens and styling**
1. ⚙ Colours come only from tokens: no literals, no palette classes, no `oklch()`/`color-mix()` inline.
   Component tokens (`--nk-*`) are preferred over semantic ones wherever a component token exists.
2. Anything a server might want different is a component token with the Graphite default as its `var()`
   fallback. It is never a hard-coded look (v2 rule).
3. ⚙ Sizes use rem and the kit scale (`--nk-space`, `--nk-text-*`). px only for hairlines
   (`--nk-border-width`) and shadow offsets.
4. ⚙ Built from vendored shadcn + `nk-*` utilities. It never redefines an `nk-*` name or edits a vendored
   file.
5. ⚙ Every class list passes through the kit `cn()` (3.1). It never combines two kit surface classes, and
   picks one in code.

**API**
6. ⚙ Variants come from cva, exported as `<name>Variants`, with `defaultVariants` set. Shared vocabulary:
   `size` (`sm`/`default`/`lg`), `tone` (`default`/`muted`/`destructive`/`success`/`warning`).
7. Each size variant is self-contained: it sets size, leading and gap together, so merge order can't drop a
   base class.
8. Stateful values come in pairs: controlled `value` + `onValueChange` and uncontrolled `defaultValue` (Radix's
   convention), so Lua can drive a value or leave it local.
9. Composition over configuration: sub-components (`PanelHeader`, `MenuRowDetails`) for structure, and a
   `className` on each part. `asChild` only where the component wraps a Radix part, and then it spreads props
   and forwards the ref [R: Radix composition guide].
10. Props cover the intent schema it renders (dispatch table). No field of the intent is dropped.

**States**
11. ⚙ Every state is reachable from props, with no timers or hover needed for a screenshot: default, hover,
    focus-visible, active/selected (`active`/`data-active`), disabled, readOnly, `inert` (Lua-driven
    highlight), loading/indeterminate, error/invalid, empty, and over-threshold where relevant.
12. ⚙ The root has `data-slot="<name>"`, each part `data-slot="<name>-<part>"`, and states are mirrored as
    `data-*` attributes (`data-active`, `data-state`), so themes and tests can target them.

**Motion**
13. Durations are `var(--nk-time)` and the easing `var(--nk-ease-out)`. At `--nk-motion: 0`, nothing animates
    and any time-left line is hidden. ⚙ Centred elements never animate `transform` (breaks centred dialogs on
    Chromium 103).
14. Gliding values (fills, needles) move by `transform: scaleX/rotate` on their own layer, never by width or
    repaint (the slab line pattern).

**Focus and input: keyboard, mouse, controller**
15. Every interactive element is reachable and operable by keyboard: arrows move, Enter/Space act, Left/Right
    step, and Escape goes through surfaces (never a local keydown that posts close).
16. Focus is always visible (`focus-visible` and the row indicator), and the highlight can be driven from Lua
    (`active` + `inert`) for controller or keyboard focus that CEF doesn't see as DOM focus. Hover never changes
    anything under `inert` (the CEF `:hover` sticking quirk).
17. Never calls focus natives. The surface or owning resource does.

**Accessibility**
18. Meaning never by colour alone: icon + colour + value (v2 HUD rule). Status uses `role="status"`/`alert` as
    fits, and progress uses `role="progressbar"` with values.
19. ⚙ axe passes (WCAG 2.1 AA tags) on every state route. The contrast of what it draws passes in all
    identities and in high contrast.
20. Reading text is ≥ 16px (`--nk-text-base`) and labels ≥ 13px in every identity. Density never shrinks
    text.

**Engine and resolution**
21. Nothing essential on `:has()` or `@container`, no individual `scale`/`translate`, nothing that needs a
    post-103 API (`linear()` easing, `color-mix` at runtime).
22. ⚙ Screenshot baselines exist at 1920×1080 for every state in every identity (Graphite, Signal, Velvet,
    Vector, Daylight), plus 1280×720 and 2560×1440 for the canonical state, in the Chromium 103 binary.

**Shipping**
23. ⚙ It has a `registry.json` entry with accurate `dependencies`/`registryDependencies` (the sync guard
    already checks imports) and `meta.since` / `meta.contract`. ⚙ A test file covers any logic (timing,
    formatting, thresholds).
24. ⚙ It has a `/components` page with all states over a game scene, plus a props table generated from its
    TypeScript types [I: a ts-morph or react-docgen step].
25. It has a changeset naming the component. A deprecation follows 3.7.

---

## 5. Risks of the current approach

### 5.1 Synced copies

**What they buy.** [V] Every resource is complete on its own: a server can run one system without the repo,
just as a shadcn user owns their copy. This is the right default for FiveM, where resources ship as folders.

**What they cost.**
- The same file lives in about 20 places (`lib/utils.ts` alone is identical across every system, addon, the
  template and the site, plus agent worktrees). [V] A fix that misses `pnpm sync` ships stale in some of them,
  and nothing catches it today (gap 3).
- Agents see the copies first in search results and edit them. The rule "never edit by hand" relies on reading
  CLAUDE.md. [I]
- Review noise: one token change produces a 20-file diff, which hides real changes from reviewers. [I]

**Mitigations.**
- The drift gate (3.4).
- A header line in every synced file (`// synced from <source> by pnpm sync: do not edit`), which the gate
  verifies.
- `.gitattributes` `linguist-generated=true` on synced paths, so GitHub collapses them in PR diffs. [I]
- Longer term, `@nuikit/init.lua` already removes the Lua copies (architecture §1). The web copies could follow
  through the renderer module path for intents. Bespoke screens keep copies by design.

### 5.2 Copy-paste registry drift

There are two directions.

**Downstream: users' copies fall behind.**
- The registry has no version field, so users can't see what changed [R].
- shadcn's own answer is diff tooling and codemods (`add --diff`, `migrate`), not automatic updates [R]. It
  works only if nuikit tells users what changed per component (3.7).
- Worse for nuikit than for shadcn: nuikit components read **component tokens that evolve** (tokens 1.1). An
  old component copy on a new theme still renders, because of the `var()` fallbacks [V], but it won't pick up
  identity features. The fallbacks are the safety net. Keep them mandatory (contract item 2), and keep
  tokens additive (tokens.md: renaming or removing a token means v2).

**Upstream: nuikit's vendored shadcn falls behind.**
- Base UI is now shadcn's default [R]. Tailwind v4 point releases change canonical class names, which the
  better-tailwindcss `enforce-canonical-classes` rule exists for [R].
- Mitigations:
  - re-copy on a schedule (each minor release), as a dedicated PR with screenshots, so the diff is reviewed as
    upstream drift and nothing else;
  - record the upstream commit in `vendor/shadcn/README.md`. [I]

### 5.3 Chromium 103 lowering

**What it buys.** [V] Stock Tailwind v4 / shadcn CSS (oklch, `color-mix`, media ranges) works in FiveM's CEF,
so the ecosystem's themes and components are usable unchanged. This is nuikit's quiet moat.

**Risks.**
1. **Silent partial lowering.** The plugin lowers stylesheets, not inline styles or runtime strings [V,
   CLAUDE.md]. A component that builds `style={{ background: "color-mix(…)" }}` renders transparent in game and
   fine in the browser. The `cef-proof` job tests the plugin on a fixed input, not on every component's output
   [V].
   - Mitigation: run 3.3's screenshots in Chromium 103 so every component is proven in the engine. Add a lint
     rule against `oklch(`/`color-mix(` in TSX strings (contract item 1).
2. **Two targets soon.** Chromium 144 is on FiveM canary [V, CLAUDE.md]. For a period, servers will run both.
   - The lowering must stay correct for 103, and must not degrade 144: rgb channels instead of oklch lose wide
     gamut [I].
   - Plan: one build, lowered, until 144 reaches release, then a `target` option. Never two component sources.
     [I]
3. **Tailwind upgrades.** Each Tailwind v4.x can emit new CSS features (`@property` usage, new color functions)
   that the plugin doesn't yet lower.
   - Mitigation: pin Tailwind minor in the template. CI renders the built kit CSS for every system in 103 and
     greps the output for unlowered functions (`oklch(`, `color-mix(`, `@container`, `:has(`), which
     `nuikit-doctor` could reuse. [I]
4. **Bus factor.** The lowering is custom compiler code that only nuikit maintains.
   - Mitigation: keep its test corpus as real-world input (a TweakCN theme gallery, the shadcn kit CSS)
     instead of hand-made cases. Write down its "known not lowered" list in `packages/vite` README. [I]
5. **Retirement.** When 144 is universal, the lowering should be removable without touching components. That
   works only if no component depends on lowering artefacts (the `-rgb`/`-a` channels). [V] The kit uses
   channels in `kit.css` and some inline styles (`--nk-slab-tone-rgb`). [I] Keep channel use inside `kit.css`
   and component tokens, never in component TSX, so retirement is a kit-only change.

---

## 6. Suggested order

Each step ships on its own:

1. Kit `cn()` + merge tests (3.1), and the sync drift gate (3.4). One PR, half a day each.
2. The component contract doc (§4) and registry `meta` (3.7).
3. Visual regression + axe on the site's component routes in Chromium 103 (3.3, 3.9). Spike the Playwright
   ↔ 103 attachment first.
4. The ESLint class rules (3.6) and `nuikit check --components` (3.5).
5. Per-identity DTCG + Figma import (3.8), with the v2 step 4 work.
6. Base UI decision record (3.10) at the next upstream re-copy.

**Unproven, and what would change this plan**
- If Playwright can't drive Chromium 103 reliably, use puppeteer-core 15 + pixelmatch. Same plan, more glue.
- If `better-tailwindcss` can't read the synced `index.css` (the `@theme inline` + `@utility` mix), fall back to
  `nuikit check` rules generated from `kit.css`.
- If Figma's native DTCG import mishandles keywords or `$extensions`, which forum reports suggest is possible,
  import only colours, numbers and dimensions, and keep keywords as Figma string variables set by a plugin
  script.

---

Sources:
- [W3C: Design Tokens specification reaches first stable version (2025.10)](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
- [Design Tokens Format Module 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/)
- [Terrazzo: DTCG tokens guide](https://terrazzo.app/docs/guides/dtcg/)
- [Tokens Studio: Git sync (multi-file is Pro)](https://docs.tokens.studio/token-storage/remote/sync-git-gitlab)
- [Figma REST API: Variables (Enterprise, full seat)](https://developers.figma.com/docs/rest-api/variables)
- [Schema 2025 TLDR: native DTCG variable import/export, extended collections](https://www.designsystemscollective.com/schema-2025-tldr-the-we-promise-we-didnt-forget-about-design-systems-edition-ca5f2543deb5)
- [shadcn/ui changelog](https://ui.shadcn.com/docs/changelog)
- [shadcn registry-item.json schema](https://ui.shadcn.com/schema/registry-item.json)
- [How to update shadcn/ui components (add --diff, --view, migrate)](https://shadcnstudio.com/blog/how-to-update-shadcn-ui/)
- [shadcn/ui switches default from Radix to Base UI (OpenReplay)](https://blog.openreplay.com/shadcn-ui-radix-base-ui-switch/)
- [Base UI v1.0.0 release notes](https://app.unpkg.com/@base-ui/react@1.6.0/files/docs/react/overview/releases/v1-0-0.md)
- [Base UI alternatives (Radix release cadence)](https://designrevision.com/alternatives/base-ui.md)
- [Radix Primitives: composition and asChild](https://www.radix-ui.com/docs/primitives/guides/composition)
- [Radix Themes: Theme component](https://www.radix-ui.com/themes/docs/components/theme)
- [Radix Colors: understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [Geist colors](https://vercel.com/geist/colors)
- [Material Color Utilities README (HCT, tonal palettes, schemes)](https://chromium.googlesource.com/external/github.com/material-foundation/material-color-utilities/+/91da30d89e70c3dc9575ec71a1ebe8874d881f29/README.md)
- [tailwind-merge configuration (v2.0 docs)](https://github.com/dcastil/tailwind-merge/blob/v2.0.0/docs/configuration.md)
- [tailwind-merge issue #368: custom font-size merged away](https://github.com/dcastil/tailwind-merge/issues/368)
- [tailwind-merge 3.3.1 README (Tailwind v4 support)](https://unpkg.com/tailwind-merge@3.3.1/README.md)
- [tailwind-variants: slots](https://tailwind-variants.org/docs/slots)
- [eslint-plugin-better-tailwindcss README](https://unpkg.com/eslint-plugin-better-tailwindcss@4.7.0/README.md)
- [better-tailwindcss: no-unknown-classes](https://raw.githubusercontent.com/schoero/eslint-plugin-better-tailwindcss/HEAD/docs/rules/no-unknown-classes.md)
- [MUI: migrating from deprecated APIs (codemods)](https://next.mui.com/material-ui/migration/migrating-from-deprecated-apis/)
- [Playwright: accessibility testing](https://playwright.dev/docs/accessibility-testing)
- [Playwright visual regression testing in CI (Argos)](https://argos-ci.com/blog/playwright-visual-regression-testing-ci)
- [Lost Pixel (npm)](https://npmjs.com/package/lost-pixel)
- [Chromatic pricing](https://chromatic.com/pricing)

*Blocked during research (not fetched):* tailwind-merge `main` configuration and limitations docs, and the
Playwright visual-comparisons mirror. Claims that would have cited them use the v2.0 docs and issue #368. The
Playwright screenshot-determinism claim (§3.3) rests on the Argos guide's search listing and general Playwright
practice, so treat it as [R]-weak.
