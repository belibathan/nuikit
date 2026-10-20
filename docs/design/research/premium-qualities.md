# What makes a UI feel premium, and how to build it

Date: 2026-10-20. Input to design v2 (`docs/design/v2.md`). Builds on `docs/design/research.md`, which covers the
FiveM bar, GTA conventions, accessibility floors and the basic motion ranges. This file doesn't repeat those. It
answers one question: **which qualities make top product UIs and top game UIs read as premium, what concrete
techniques produce each one, and what nuikit should turn into a token, a component rule or a kit utility.**

Principles only. Nothing here copies a proprietary look; every recommendation is expressed as nuikit's own tokens.

**Evidence tags**
- **[V]** verified this session from a fetched source (see Sources).
- **[R]** recalled, not fetched this session. Check before relying on it.
- **[I]** inference: my recommendation or calculation.

**What's thin.** Several primary sources were blocked from fetching here: Rauno Freiberg's essays
(`rauno.me/craft/interaction-design`, `/craft/depth`), Emil Kowalski's own site, and Geist's colour, type and
materials pages. Emil's rules were read from his published agent skill, which states them with numbers. Game
studios publish very little about UI with numbers. Forza, Gran Turismo, Apex, CoD, NFS and Spider-Man evidence
is mostly critiques, patch notes and interviews, so game claims carry more [R] and [I] than product claims.

**Platform reminder (applies to every section).** Chromium 103 NUI drawn over a live 3D world: no `:has()` or
`@container`; animate `transform` and `opacity` only, and never `transform` on a centred dialog (shadcn centres
with a translate); no individual `scale`/`translate` properties; no CSS blur over the game
(`research.md` §1.4); colours only from theme tokens; `--nk-motion` 0 stops everything.

---

## The short answer

Premium is **the absence of anything cheap**, more than the presence of anything fancy. Every source converges
on the same few things:
1. it responds at once;
2. it moves with purpose and physics;
3. nothing is ever unstyled, in any state;
4. it aligns to a rhythm you feel but don't see;
5. it uses colour and ornament with restraint;
6. type does the hierarchy.

Linear calls it "consistency and alignment over decoration" [V linear]. Valorant's overhaul removed "decoration
elements that were pretty but didn't really serve a purpose" [V valorant]. Gran Turismo's critique puts its
premium feel in "seriousness" rather than flash [V feedme-gt]. Effects (glow, glass, particles) are a last 10%
that only works on top of the other 90% [I].

---

## 1. States feel instant

**The quality.** Input and response feel like one event. Nothing waits on an animation, nothing flickers.

**Techniques**
- **Don't animate what's done often.**
  - No animation for keyboard-initiated actions, or for actions done 100+ times a day [V emil].
  - Hover and list navigation (tens of times a day) get reduced motion or none [V emil].
  - Apple HIG: skip extra motion for actions people repeat often [V hig-motion].
- **Feedback budget.** Press feedback 100–160 ms; tooltips and small popovers 125–200 ms; dropdowns 150–250 ms;
  modals and drawers 200–500 ms; "UI animations should stay under 300 ms" [V emil]. Carbon's micro-interaction
  tokens are 70 ms and 110 ms [V carbon].
- **Loading without flicker.**
  - Delay a spinner or skeleton by 150–300 ms, then keep it visible for at least 300–500 ms [V vercel].
  - Skeletons mirror the final content's dimensions exactly [V vercel].
- **Mutations land fast.** POST/PATCH/DELETE should complete in under 500 ms [V vercel]. Keep submit enabled
  until submission starts, then disable it and show progress [V vercel].
- **Remove friction ("oil") separately from adding feedback ("juice").** If an action has one sensible
  outcome, the button should just do it. Menu pauses that added ~1.5 s per purchase made buying 99 potions take
  ~2.5 minutes [V oil].
- **Navigation depth.** MW2 (2022) drew complaints that back exited the whole menu instead of one step, and that
  core loadout tasks were too many screens deep [V kotaku-mw2]. Destiny 2 made travel one step from anywhere
  [V destiny-ux].

**Over a 3D world on Chromium 103**
- A NUI round trip (POST → Lua → `SendNUIMessage`) adds latency the browser can't hide [I]. Highlight, press and
  selection must update **locally first**, then confirm.
- Keyboard and d-pad list movement must be instant. Our 40 px row moving the highlight with a 160 ms fade would
  read as lag after the third press [I, from V emil].

**Adopt in nuikit**
- **Component rule:** row highlight, tab switch, toggle and checkbox state change with **no transition** when
  driven by keyboard or controller. Only pointer hover may ease (≤ 80 ms) [I].
- **Tokens:** `--nk-loading-delay: 200ms` and `--nk-loading-min: 400ms`, honoured by a `useDelayedPending` hook
  in `registry/nuikit/hooks` and by every loading state [I, numbers from V vercel].
- **Component rule:** optimistic local state for every control; the POST result reconciles it [I].
- **Component rule:** back/Escape goes back **one level**, never out of the whole surface (the surfaces runtime
  already stacks Escape; this extends it inside a surface) [I, from V kotaku-mw2].

---

## 2. Motion with purpose and physics

**The quality.** Things move like objects: they come from somewhere, decelerate into place, leave faster than
they came, and can be interrupted mid-flight.

**Techniques**
- **Easing.**
  - Enter and exit with ease-out; move or morph on screen with ease-in-out; hover and colour with `ease`;
    constant motion (progress) linear; "never use ease-in for UI animations" [V emil].
  - Curves: strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)`; strong ease-in-out
    `cubic-bezier(0.77, 0, 0.175, 1)`; iOS-like drawer `cubic-bezier(0.32, 0.72, 0, 1)` [V emil].
  - Carbon splits **productive** motion (tasks: buttons, dropdowns, tables) from **expressive** (big moments,
    primary actions, alerts). Productive entrance `cubic-bezier(0, 0, 0.38, 0.9)`, expressive entrance
    `cubic-bezier(0, 0, 0.3, 1)` [V carbon].
- **Duration scales with distance and size** [V carbon]. Carbon's ladder: 70, 110, 150, 240, 400, 700 ms
  (700 ms is background dimming) [V carbon].
- **Exit faster than enter** [V emil]. `research.md` already sets ~30% faster out.
- **Never from nothing.** Never animate from `scale(0)`; start at ~`scale(0.95)` with `opacity: 0` [V emil].
  Tooltip: `scale(0.97)` + opacity over 125 ms ease-out [V emil].
- **Origin-aware.** Popovers scale from their trigger (`transform-origin` at the trigger); modals keep
  `center`. "Default `center` is wrong for almost all popovers" [V emil]. Radix (under shadcn) exposes the
  trigger-side origin as a CSS variable [R].
- **Interruptible.** Use CSS **transitions**, not keyframes, for anything triggered rapidly; keyframes restart
  from zero [V emil].
- **Stagger** lists 30–80 ms per item [V emil].
- **Compositor only.** Animate `transform` and `opacity`; never `transition: all` [V vercel, V emil]. Prefer
  CSS, then WAAPI, then JS libraries [V vercel].
- **Realism.** "Strive for realism and credibility"; motion is optional and never the only carrier of
  information [V hig-motion].
- **Slow-motion review.** Check every animation at 2–5× duration for origin, overlap and sync [V emil].

**Over a 3D world on Chromium 103**
- The game is already moving behind every panel. UI motion competes with the world, so it should be
  **smaller and shorter** than on a static desktop: offsets of 4–8 px, not 24+ [I].
- Centred dialogs can't use `transform`. Animate an **inner wrapper** (the panel content), or use opacity only
  on the dialog and scale its contents [I, from the repo rule].
- Springs need JS. On the HUD a spring per frame costs main-thread time. Use CSS transitions for UI, and a
  small critically damped spring only for gauge needles and meters fed by `nk.stream` [I].

**Adopt in nuikit**
- **Tokens (motion ladder):** `--nk-dur-1: 80ms` (press, hover), `--nk-dur-2: 160ms` (popover, panel; today's
  `nk-enter`), `--nk-dur-3: 240ms` (drawer, toast, large panel), `--nk-dur-4: 400ms` (full-screen scene);
  `--nk-exit: 0.7` multiplier for exits. v2's single `--nk-duration` becomes the base that scales the ladder
  [I, values from V emil + V carbon].
- **Tokens (easing):** `--nk-ease-out: cubic-bezier(0.23, 1, 0.32, 1)` (enter and exit),
  `--nk-ease-move: cubic-bezier(0.77, 0, 0.175, 1)` (on-screen moves), `--nk-ease-drawer:
  cubic-bezier(0.32, 0.72, 0, 1)`. v2's `--nk-ease` aliases `--nk-ease-out` [V emil].
- **Utilities:** `nk-pop` (scale 0.96 → 1 + opacity, origin from the trigger variable, `--nk-dur-2`) for
  popovers, menus, tooltips and target-eye panels; `nk-enter` stays the panel fade; `nk-stagger` sets
  `transition-delay: calc(var(--i) * 40ms)` capped at 6 items [I].
- **Check rules (`nuikit check`):** flag `transition: all`, `scale(0)`, ease-in on entry, `@keyframes` on
  interactive state, and `transform` on a centred dialog's own element [I].

---

## 3. Nothing is unstyled

**The quality.** No state, edge case or browser default ever shows through. This is the single biggest
premium signal and the cheapest to fail [I; research.md §5.4 says the same for FiveM].

**Techniques**
- **A full state matrix per control.** Rest, hover, focus-visible, active/pressed, selected, disabled,
  loading, empty, error. Radix's 12-step scale gives each a slot: 3 rest, 4 hover, 5 pressed/selected, 7 border,
  8 strong border and focus ring [V radix].
- **Interactive states gain contrast.** Hover, active and focus should have more contrast than rest [V vercel].
- **Focus** uses `:focus-visible`, and `:focus-within` for grouped controls [V vercel].
- **Browser leaks.** Windows `<select>` needs explicit `background-color` and `color` [V vercel]; scrollbars
  should be previewed as Windows shows them [V vercel]; selection colour, placeholder, autofill and the caret
  are themed [R].
- **Typographic details.** The ellipsis character, curly quotes, a non-breaking space between number and unit
  (`10 MB`), one decimal policy per context (0 or 2, never mixed) [V vercel].
- **Test every view in every state.** Linear stress-tested each view type across all states before shipping;
  "polish shows up in edge cases" [V linear].
- **Labels match content; looks match behaviour.** Cyberpunk 2077 is criticised for a tag styled like a button
  that isn't interactive, next to a real button styled differently, and for tab labels that don't match the
  screens [V cyberpunk].

**Over a 3D world**
- NUI's leaks are specific: the default cursor, text selection on double-click, image drag ghosts, focus
  outlines on click, scrollbars, and a white flash before CSS loads [R].

**Adopt in nuikit**
- **Kit base (in `kit.css`, not a utility):** `user-select: none` and `-webkit-user-drag: none` by default
  (opt back in for inputs and copyable values); themed `::selection`, `::placeholder`, caret and scrollbars;
  `background: transparent` on `html` so nothing flashes [I].
- **Component rule:** every registry component documents and ships its full state matrix, shown on the site in a
  states grid; a component without all states doesn't merge [I].
- **Utilities:** `nk-skeleton` (muted block, same box as the content, shimmer only when `--nk-motion` is 1) and
  `nk-unit` (the non-breaking unit spacing for values) [I].
- **Check rules:** flag straight quotes and `...` in copy, mixed decimal counts in one table, and visible
  `:focus` without `:focus-visible` [I].

---

## 4. Rhythm and alignment

**The quality.** Everything sits on one grid and lines up across rows, icons and edges. Users don't notice it;
they notice when it's missing. Linear: users "feel" alignment after a few minutes rather than see it [V linear].

**Techniques**
- **Align labels, icons and buttons on both axes** across sidebars and tabs [V linear].
- **Optical over geometric.** Nudge by ±1 px when perception differs from geometry (play triangles, icons in
  circles, text in pills) [V vercel].
- **Concentric radii.** Child radius ≤ parent radius, curves concentric [V vercel]. The common formula is
  inner = outer − padding [R].
- **A spacing ladder with roles.** Geist maps its steps: small steps inside a group, larger between groups,
  larger again between sections, the largest only for chapter breaks [V geist-md]. 12-column desktop grid
  [V geist-md].
- **Fixed structure, fixed places.** Gran Turismo repeats one structure (left-aligned vertical nav, the same
  button style) so players move deeper instead of relearning [V feedme-gt]. Destiny 2 puts weapons left and
  armour right, every time [V gamesradar-d2]. Cyberpunk's top tabs **move** depending on which is active, which
  "undermines spatial memory" [V cyberpunk].

**Over a 3D world**
- 1080p is the design size, but `1rem = 1.4815vh` means a 4 px step is 2.67 px at 720p and 5.33 px at 1440p
  [I, from design.md]. Hairlines and 1 px nudges can blur or vanish at 720p. Hairlines should stay a true 1 px
  (or `max(1px, …)`) rather than scale [I].

**Adopt in nuikit**
- **Token:** `--nk-hairline: max(1px, 0.0625rem)` used by every border; v2's `--nk-border-width` defaults to it
  [I].
- **Component rule (concentric radii):** v2's panel/control/chip radii become formulas:
  `--nk-panel-radius: calc(var(--radius) + 4px)`, inner blocks `calc(var(--nk-panel-radius) - var(--nk-panel-pad))`,
  clamped at 2 px [I, rule from V vercel].
- **Component rule:** tabs, nav and segmented controls never reflow or reorder when the active item changes;
  the active indicator moves, the items don't [I, from V cyberpunk].
- **Component rule:** icon + label rows centre the icon on the label's cap height, not the line box (a 1 px
  optical offset baked into `nk-row`) [I, from V vercel].

---

## 5. Restraint in colour

**The quality.** Mostly neutral. Colour appears rarely, so when it does it means something.

**Techniques**
- **Monochrome first.** Linear's redesign was explored "mainly with black and white opacities" to set elevation
  and hierarchy before colour [V linear]. Geist: design in monochrome, colour only for meaning; ornamental
  gradients, glows and glass are rejected [V geist-md]. Linear also cut accent colour and blue chrome for "a more
  neutral, timeless palette" [V linear].
- **Generate, don't hand-pick.** Linear went from 98 hand-set variables per theme to three inputs (base, accent,
  contrast) in a perceptual space (LCH), with contrast as a tunable input [V linear].
- **Perceptual scales with contrast built in.** Stripe built scales in CIELAB so each level number means the same
  lightness across hues: any two colours **5 levels apart** pass small-text contrast, **4 apart** pass icons and
  large text [V stripe]. Radix guarantees APCA Lc 60 for step 11 and Lc 90 for step 12 on step 2 [V radix].
  Vercel prefers APCA over WCAG 2 [V vercel].
- **Tint neutrals toward the surface hue.** On non-neutral backgrounds, tint borders, shadows and text toward that
  hue [V vercel].
- **One signal colour for "you can act here."** Gran Turismo: bright orange for interactive elements against
  muted greys; red on price and horsepower to signal weight [V feedme-gt].
- **Decoration in the signal colour kills the signal.** Cyberpunk's decorative HUD elements share the same red as
  functional ones, so they compete; a monochrome red map fails to distinguish zones [V cyberpunk].

**Over a 3D world**
- The world supplies most of the colour on screen. A neutral UI reads as *intentional* against it; a saturated
  UI reads as noise [I]. That's why GTA's own HUD is white with semantic colour [R, research.md §1.3].
- oklch is lowered to rgb at build time by `vite-plugin-nuikit`, so perceptual generation happens in the
  compiler, never in inline styles [repo rule].

**Adopt in nuikit**
- **Compiler (tokens):** generate a 12-step neutral and a 12-step brand scale per theme in OKLCH from v2's
  identity inputs, Radix-style roles: 1 app, 2 panel, 3 control, 4 hover, 5 pressed/selected, 6 divider,
  7 control border, 8 strong border/focus, 9 solid, 10 solid hover, 11 secondary text, 12 primary text
  [I, roles from V radix]. Existing shadcn tokens map onto steps, so TweakCN pastes still work.
- **Contrast guarantee:** the compiler enforces Stripe's level-distance rule for text-on-surface pairs and
  checks against `#fff` (sky) as `research.md` §2.6 asks [I, V stripe].
- **Token:** `--nk-signal` = the one interactive colour (defaults to `--brand`); used only for the active
  indicator, focus and the primary action [I].
- **Check rule:** count distinct chromatic tokens per page; warn above 3 (signal + up to 2 status colours)
  [I].

---

## 6. Typographic hierarchy

**The quality.** You can tell what matters from type alone: size, weight and colour, not boxes and lines.

**Techniques**
- **Few faces.** "Minimize the number of typefaces"; too many obscure hierarchy and feel "poorly designed"
  [V hig-type]. Linear: Inter Display for headings, Inter for everything else [V linear]. Geist: one sans, one
  mono for code and short identifiers [V geist-md].
- **Hierarchy through weight, size and colour together**, kept intact when the user scales text [V hig-type].
- **Avoid light weights.** Prefer Regular to Bold; avoid Ultralight, Thin and Light, especially small; thin
  custom fonts need larger sizes [V hig-type].
- **Minimum sizes depend on distance.** HIG minimums: macOS 10 pt (default 13), iOS 11 pt (17), tvOS 23 pt
  (29) [V hig-type]. A game at 1080p on a desk sits between macOS and tvOS [I]; `research.md` already sets
  16 px body / 18 px+ HUD.
- **Tabular numerals** for anything compared or changing [V vercel].
- **Text over the game needs a backplate.** HIG's game example: names over objects are wrong without a visible
  background and right inside a shaded lozenge [V hig-type].
- **Display type for the one big number.** Gran Turismo gives expensive decisions large, well-spaced layouts and
  technical stats, no marketing copy [V feedme-gt].

**Over a 3D world**
- Small text on a moving background loses legibility before it loses contrast [I]. Medium (500) is a safer
  floor than 400 for anything ≤ 14 px drawn on the HUD [I, from V hig-type light-weight rule].
- Tight display tracking (−0.02em) helps big numbers; small labels need neutral or slightly positive tracking
  [R; HIG tracking tables vary tracking by size].

**Adopt in nuikit**
- **Tokens:** v2's `--font-display` and `--nk-type-ratio` stand. Add a size-dependent tracking rule:
  `--nk-tracking-display` on ≥ 24 px, `0` on body, `+0.01em` on ≤ 13 px labels [I].
- **Component rule:** max **two families** per UI (sans + numeric/mono). The numeric face is for numbers only
  [I, V hig-type].
- **Component rule:** HUD text ≤ 14 px uses weight ≥ 500 and always sits on a backplate or text shadow [I].
- **Utility:** `nk-figure` = display size + numeric font + tabular + the dimmed-leading-zero treatment from v2 §4
  (`0`40) [I].

---

## 7. Depth through light, not borders

**The quality.** Layers separate because they're lit differently, not because a box is drawn round them.

**Techniques**
- **Elevation from surface lightness.** Linear uses its colour system to set elevation for background, panels,
  dialogs and modals [V linear]. Radix steps 1–2–3 do the same [V radix].
- **Layered shadows, one light.** At least two layers (ambient + direct) [V vercel]. One light direction for
  the whole page, all offsets the same ratio (y = 2× x); higher elevation → larger offset and blur, lower
  opacity [V comeau]. Example large elevation: five layers at 1–16 px offsets [V comeau].
- **Hue-matched shadows.** A darker, more saturated version of the background hue instead of black at low alpha,
  which greys things out [V comeau].
- **Semi-transparent borders with shadows** for edge clarity [V vercel].
- **Don't animate shadows**; each layer costs paint [V comeau].
- **Depth by layering in front.** Rauno's "dirtying the frame": foreground elements and choreography create depth
  [V uiux-rauno; full essay blocked].

**Over a 3D world on Chromium 103**
- A drop shadow is invisible on a dark night scene and looks like dirt on snow [I]. Over the game, shadows can't
  carry the whole job.
- What works on any background: (a) an opaque-enough surface (v2's floor 0.92), (b) a 1 px **inner top
  highlight** (v2's `--nk-surface-edge`), (c) a semi-transparent hairline in the surface hue, and (d) a tight
  ambient shadow only for separation from bright scenes [I].
- No `backdrop-filter`. Glass is out over the game [research.md §1.4].
- **Gradient banding.** Very dark, subtle gradients band on 8-bit output; Vercel recommends images over CSS masks
  when fading to dark [V vercel]. v2's `--nk-surface-gradient: 0.04` is near that limit [I]. Spike it on a dark
  scene.

**Adopt in nuikit**
- **Token recipe:** `--nk-elevation` (`none`/`soft`/`deep`) expands to a 2- or 3-layer `box-shadow` built from
  `--nk-shadow-color` (surface hue at low lightness, not black) with a fixed light (x 0, y 1–2× blur ratio)
  [I, V comeau, V vercel].
- **Utility:** `nk-lit` = inner top highlight (`inset 0 1px 0 rgb(255 255 255 / var(--nk-surface-edge))`) +
  hue-tinted hairline. `nk-panel` uses it by default [I].
- **Component rule:** separate layers by **surface step** first (panel = step 2, control = 3, hovered = 4), add
  borders only between peers that share a step [I, V radix].
- **Check rule:** flag animated `box-shadow` [V comeau].

---

## 8. Density done right

**The quality.** As much as needed on screen, no more, with tight grouping and generous empty space around the
group. Dense where the user works, sparse where they decide.

**Techniques**
- **Opt-in compact.** Raycast's Compact Mode blends secondary chrome into the background during the core flow
  [V raycast]. Linear tested navigation from condensed to spacious [V linear].
- **Enlarge what starts the flow.** Raycast enlarged the search bar and the result icons for scanning [V raycast].
- **Dense for scanning, roomy for commitment.** Gran Turismo: expensive decisions get large, well-spaced layouts
  [V feedme-gt].
- **Show on need.** Spider-Man turned off health, gadget and suit-power HUD while swinging, fading it back for
  combat [V spiderman]. Cyberpunk shows health only when not full and stamina only while draining
  [V cyberpunk]. Too much persistent info (calls, quest text, icon overload) is its main HUD failure
  [V cyberpunk].
- **Answer one question per element.** Destiny 2 removed the level from enemy health bars so the bar answers
  "can I fight this", and split boss bars into thirds for phase reading [V destiny-ux].
- **Accessibility knobs are density knobs.** Forza Horizon 5: text up to 150%, subtitle background opacity,
  ~15 HUD element toggles, analogue or digital speedo [V fh5-a11y].

**Over a 3D world**
- Density competes with the world for attention. The HUD should be dense **inside** its cluster and leave the
  centre of the screen empty [I; matches v2 §4].

**Adopt in nuikit**
- v2's `--nk-density` stands. **Component rule:** it multiplies padding and gaps only, never text size or hit
  targets (24 px minimum target [V vercel]) [I].
- **Component rule (HUD):** every always-on element declares a `reveal` policy: `always`, `onChange`
  (show N s then fade), `belowThreshold`, or `context` (vehicle, combat). Default `onChange` [I, from V
  spiderman, V cyberpunk].
- **Meter component:** optional `segments` prop for phase or threshold reading (thirds, quarters) [I, V
  destiny-ux].

---

## 9. Micro-feedback

**The quality.** Every touch gets a small, proportionate, immediate answer, and the answer says what happened.

**Techniques**
- **Press.** `transform: scale(0.97)` on `:active` (range 0.95–0.98), `transform 160ms ease-out` [V emil].
- **Hover only where hover exists.** Gate hover effects behind `@media (hover: hover) and (pointer: fine)`
  [V emil].
- **Hold to confirm.** `clip-path` fill over 2 s linear while held; release back over 200 ms ease-out
  [V emil]. Reveal with `inset(0 100% 0 0)` → `inset(0 0 0 0)` [V emil].
- **Tooltips.** Delay the first in a group; peers after it show with no delay [V vercel].
- **Sticky targets.** Destiny's free cursor slows over items and the item rises slightly; friction and highlight
  were tuned per element over many iterations [V mmo-destiny, V kotaku-destiny].
- **Closed-loop acknowledgement.** Apex's ping confirms receipt (teammates ping back), and pairs voice with a
  visual marker [V apex-ping].
- **Sound families.** Actions in the same category share a sound; separate press, release and cancel assets;
  ascending for success/open, descending for failure/close; negative feedback never harsh; vary pitch to avoid
  repetition [V audiokinetic].
- **Teach shortcuts in place.** Raycast shows each action's shortcut in a persistent bar, so users learn them
  [V raycast].

**Over a 3D world on Chromium 103**
- `scale()` press on buttons and rows is fine (they aren't centred dialogs) [I].
- NUI pointer is always "fine" with a mouse, but controller users get **no hover**. Focus must carry the same
  feedback hover does [I, research.md §2.11].
- Audio is the game's job: `PlaySoundFrontend` from Lua, or `<audio>` in NUI [R]. Presentation-only still
  allows UI sound [I].

**Adopt in nuikit**
- **Token + utility:** `--nk-press-scale: 0.97`; `nk-press` applies it on `:active` with `--nk-dur-1` and
  `--nk-ease-out`. Off when `--nk-motion` is 0 [V emil, I].
- **Component:** `HoldButton` / `nk-hold`: clip-path fill, duration from a `--nk-hold` token (default 1 s for
  GTA-style prompts, `research.md` §3), release 200 ms ease-out, cancel on release [V emil, I].
- **Component rule:** focus-visible and hover share one visual (step 4 surface + signal indicator); controller
  focus adds the 2 px ring [I].
- **Intent (later):** an optional `nk.sound(category)` with per-identity sound families (`select`, `confirm`,
  `cancel`, `error`, `toggle`), off by default, honouring a player volume pref [I, V audiokinetic].

---

## 10. Persistent, learnable structure

**The quality.** You always know where you are and where things will be. Premium apps and games reward muscle
memory.

**Techniques**
- Gran Turismo's fixed city-grid hub with a central HOME builds muscle memory from layout, not labels
  [V feedme-gt].
- Destiny 2's character screen is the hub players spend most time in; the menu supports play rather than
  interrupting it [V gamesradar-d2].
- MW2's horizontal tile strips, unfiltered flat lists and upsell widgets read as "streaming service" rather than
  game [V kotaku-mw2].
- Linear kept the core product recognisable: "evolution, not a teardown" [V linear].

**Adopt in nuikit**
- **Component rule:** lists of choices are vertical rows (already design.md rule 5); horizontal strips only for
  ≤ 7 visible items with a visible position indicator [I, V kotaku-mw2].
- **Component rule:** a surface opens where it last was (tab, scroll, selection) unless the server opts out
  [I].
- **Component rule:** over 10 items gets search or filter (already research.md §4) and the filter is
  type-aware [V destiny-ux gap, I].

---

## 11. Ornament that serves, or none

**The quality.** Every visual element does a job. Style comes from proportion and type, not decoration.

**Techniques**
- Valorant removed decorative elements and raised contrast and simplified shape language so key elements stand
  out [V valorant].
- Cyberpunk's decorative FUI carries the same visual weight as functional data, and icons are too detailed at
  their size [V cyberpunk]. Its HUD's slight perspective and optional chromatic aberration *do* work because they
  tie the HUD to the character's optics [V cyberpunk]: diegetic ornament earns its place, generic ornament
  doesn't [I].
- Valorant's art lead: "We're not trying to make the most beautiful game ever", clarity on any hardware first
  [V valorant-art].
- Destiny 2: flourishes "never impede navigation" [V gamesradar-d2].
- Gran Turismo: black backgrounds, no gradients or glow, one dominant element per screen [V feedme-gt].

**Adopt in nuikit**
- **Component rule:** ornament tokens (`--nk-glow`, `--nk-cut`, ticks) apply only to *active or live* parts
  (the active row, a moving needle, a redline), never to static chrome [I].
- **Component rule:** one dominant element per surface (the title, the big number, or the primary action),
  extending design.md's "one primary" to visual weight [I, V feedme-gt, V valorant].

---

## 12. Live values that glide (HUD and data)

**The quality.** Numbers and meters change smoothly and legibly, never jitter, never reflow.

**Techniques**
- Tabular numerals or mono for comparison [V vercel].
- Animate `transform`, not `width`/`height`/`top`/`left` [V vercel].
- Don't update CSS variables on a parent for animation; it recalculates style for every child [V emil].
- Constant motion is linear [V emil]. Cyberpunk's sliders jitter with a mouse and lack typed values
  [V cyberpunk].

**Over a 3D world on Chromium 103**
- A meter fill should be `transform: scaleX(v)` with `transform-origin: left` on the fill element, not `width`
  [I, V vercel]. A needle is `rotate()` on the needle element itself [I].
- Writing `--speed` on the HUD root every frame would restyle the whole HUD. Write the transform on the one
  element that moves [I, V emil].
- Fixed-width numeric slots (`ch` widths + tabular) stop the cluster reflowing as speed goes 9 → 10 → 100 [I].

**Adopt in nuikit**
- **Component rule (`meter`, `speedometer`, `gauge`):** fills use `scaleX`/`rotate` on the moving element,
  driven by `nk.stream` with a short linear or spring glide; no width animation, no root-level CSS vars per
  frame [I].
- **Utility:** `nk-slot-N` (`min-width: Nch`, right-aligned, tabular) for live numbers [I].
- **Bench rule:** every gliding HUD part publishes its resmon cost and a 60 fps trace on a real client,
  following the host benchmark model [I, repo rule].

---

## Ranked: the 15 highest-leverage adoptions

Ranked by (premium gain × number of surfaces it touches) ÷ cost [I].

| # | Adoption | Kind | Why it ranks here |
|---|---|---|---|
| 1 | **No transition on keyboard/controller-driven state** (row highlight, tabs, toggles); pointer hover ≤ 80 ms | component rule | The most common interaction in every menu; lag here reads cheap instantly [V emil, V hig-motion] |
| 2 | **Full state matrix per component**, shown in a states grid on the site; merge gate | component rule | "Nothing unstyled" is the biggest single signal [V linear, V vercel] |
| 3 | **Kit base hardening**: no text selection or image drag by default, themed scrollbars/selection/caret/placeholder, transparent `html` | kit.css base | Removes every web-page leak at once, zero per-UI work [I, V vercel] |
| 4 | **Motion ladder + easing tokens** (`--nk-dur-1..4`, `--nk-exit`, `--nk-ease-out/-move/-drawer`) | tokens | Makes every animation consistent and themeable (snappy vs smooth identities) [V emil, V carbon] |
| 5 | **12-step OKLCH scales with Radix roles**, generated by the compiler; shadcn tokens mapped onto steps | compiler/tokens | Gives every state and elevation a slot; contrast guaranteed by construction [V radix, V stripe, V linear] |
| 6 | **`nk-lit`** (inner top highlight + hue-tinted hairline) as the default panel depth; surface step before border | utility | Depth that works on any game background, no blur [V vercel, V comeau, I] |
| 7 | **`nk-pop`**: origin-aware 0.96 → 1 scale + fade for popovers, menus, tooltips, target eye | utility | Floating UI feels spatially anchored [V emil] |
| 8 | **`nk-press`** + `--nk-press-scale: 0.97` | utility + token | Tactile answer on every button and row for 1 line of CSS [V emil] |
| 9 | **HUD `reveal` policy** (`always`/`onChange`/`belowThreshold`/`context`), default `onChange` | component rule | The game-UI premium move: the world is the hero [V spiderman, V cyberpunk] |
| 10 | **Live values on `transform`** (meter `scaleX`, needle `rotate`, `nk-slot-N` fixed numeric slots) | component rule + utility | Smooth, jitter-free HUD at low cost [V vercel, V emil] |
| 11 | **Delayed, minimum-duration loading** (`--nk-loading-delay: 200ms`, `--nk-loading-min: 400ms`) + `nk-skeleton` matching final size | tokens + hook + utility | Kills flicker and layout jump [V vercel] |
| 12 | **Concentric radius formulas and a true-1 px hairline token** | tokens | Rhythm you feel; survives 720p [V vercel, I] |
| 13 | **`HoldButton` / `nk-hold`** clip-path fill, release 200 ms | component | Premium-feeling confirm for destructive and world actions [V emil] |
| 14 | **`nuikit check` motion and copy rules** (`transition: all`, `scale(0)`, ease-in entry, keyframes on state, animated shadows, straight quotes, mixed decimals) | CLI | Keeps the bar across third-party UIs and addons [V vercel, V emil] |
| 15 | **One signal colour + chromatic-count warning** (≤ 3 per page) | token + check | Colour restraint enforced, not hoped for [V linear, V geist-md, V feedme-gt] |

Next candidates: per-identity sound families (`nk.sound`), back-one-level inside surfaces, `nk-stagger`,
segmented meters, size-dependent tracking.

---

## Anti-patterns that read cheap

Each one is a check-rule or review candidate [I unless tagged].
- Fading or sliding the highlight as you arrow through a list [V emil].
- `transition: all`, or animating `width`, `height`, `top`, `left` [V vercel].
- Things appearing from `scale(0)`, or popovers scaling from their centre instead of their trigger [V emil].
- Ease-in on entry; exits as slow as entries; anything over ~300 ms that isn't a full-screen scene [V emil].
- Keyframe animations on hover/press that restart when re-triggered [V emil].
- Bouncy springs in productive UI [V emil: bounce 0.1–0.3 at most, avoid in most UI].
- A spinner that flashes for 50 ms; skeletons that don't match the content's size [V vercel].
- Browser leaks: default focus outline on click, selectable UI text, image drag ghosts, grey Windows scrollbars,
  a white `<select>` popup in a dark theme [V vercel, R].
- Black, single-layer, large-blur shadows that grey out the surface [V comeau]; animated shadows [V comeau].
- Glassmorphism and CSS blur over the game [research.md §1.4].
- Borders on everything, boxes inside boxes, instead of surface steps [I, V linear, design.md rule 1].
- Mismatched radii: the same radius on a panel and the control inside it [V vercel].
- More than 2–3 chromatic colours on one surface; decoration in the same colour as status [V cyberpunk].
- Many typefaces; light or thin weights at small sizes [V hig-type].
- Proportional digits on changing numbers; mixed decimals; `10MB` without a space; `...` and straight quotes
  [V vercel].
- Generic sci-fi ornament (scan lines, brackets, hex grids) with the same weight as data [V cyberpunk].
- Persistent full HUD while nothing is happening; icon overload [V cyberpunk, V spiderman].
- Tabs or nav that move when the active one changes [V cyberpunk].
- Something styled like a button that isn't one, and the reverse [V cyberpunk].
- Back/Escape that exits everything instead of one level; core tasks many screens deep [V kotaku-mw2].
- Horizontal tile strips and upsell widgets for long lists ("streaming service" menus) [V kotaku-mw2].
- Hover-only affordances that controller users never see [I, research.md §6].
- Harsh, identical, repeated UI sounds [V audiokinetic].

---

## What would change this

- **Chromium 103 costs.** `clip-path` animation (for `nk-hold`, `nk-reveal`) may not be compositor-only in
  Chromium 103 [R]. Spike it at 60 fps over the game, as v2 step 1 already plans for cut corners.
- **Shadows over the game.** If layered shadows cost frames or look dirty on bright scenes, `--nk-elevation`
  defaults to `none` and `nk-lit` carries depth alone.
- **Gradient banding** on dark surfaces may force `--nk-surface-gradient` to 0 or a dithered image.
- **Instant highlight** may feel too abrupt with a mouse. If so, keep 0 ms for keys and d-pad and 60–80 ms for
  pointer, which the rule already allows.
- **Game evidence is thin.** Forza, Gran Turismo, Apex, CoD, NFS and Spider-Man claims rest on critiques and
  patch notes, not studio specs. A footage review (Game UI Database) would strengthen §8–§11.

---

## Sources

Fetched and used:
- Vercel, Web Interface Guidelines: https://vercel.com/design/guidelines [vercel]
- Vercel, guidelines as an agent command (changelog): https://vercel.com/changelog/web-interface-guidelines-now-available-as-an-agent-command
- Vercel, Geist design guidance (markdown): https://vercel.com/design.md [geist-md]
- Vercel, Geist overview: https://vercel.com/geist
- Emil Kowalski, design engineering skill (durations, easings, press, origin, interruptibility):
  https://tessl.io/registry/skills/github/emilkowalski/skill/emil-design-eng [emil]
- Linear, How we redesigned the Linear UI: https://linear.app/now/how-we-redesigned-the-linear-ui [linear]
- Raycast, A fresh look and feel: https://raycast.com/blog/a-fresh-look-and-feel [raycast]
- Apple HIG, Motion: https://developer-mdn.apple.com/design/human-interface-guidelines/foundations/motion [hig-motion]
- Apple HIG, Typography: https://developer.apple.com/design/human-interface-guidelines/typography.md [hig-type]
- Stripe, Designing accessible color systems: https://stripe.com/it-ca/blog/accessible-color-systems [stripe]
- Radix Colors, Understanding the scale: https://radix-ui.com/colors/docs/palette-composition/understanding-the-scale [radix]
- IBM Carbon, Motion: https://carbondesignsystem.com/elements/motion/overview/ [carbon]
- Josh W. Comeau, Designing beautiful shadows: https://www.joshwcomeau.com/css/designing-shadows [comeau]
- Designing Depth (Rauno Freiberg summary): https://uiuxshowcase.com/resources/designing-depth-rauno-freiberg/ [uiux-rauno]
- Fidgetability (on Rauno's Invisible Details): https://designlobster.substack.com/p/150-fidgetability
- Valorant, Preview the future of Valorant's interface: https://playvalorant.com/en-gb/news/game-updates/preview-the-future-of-valorant-s-interface/ [valorant]
- Inverse, Valorant art style interview: https://inverse.com/gaming/valorant-art-style-interview-moby-francke [valorant-art]
- Interface In Game, Cyberpunk 2077 UX/UI critique: https://interfaceingame.com/articles/cyberpunk-2077-ux-ui-critique [cyberpunk]
- GDC Showcase, how Cyberpunk 2077 built its UI: https://expo.gdconline.com/news/learn-how-cyberpunk-2077-built-its-impressive-ui-gdc-showcase-session
- Feedme, Gran Turismo's UI was mechanical by design: https://www.feedme.design/gran-turismos-ui-wasnt-flashy-it-was-mechanical-by-design [feedme-gt]
- Game Developer, UX enhancements from Destiny 1 to Destiny 2: https://www.gamedeveloper.com/design/ux-enhancements-from-destiny-1-to-destiny-2 [destiny-ux]
- GamesRadar, Destiny 2 menus: https://www.gamesradar.com/destiny-2-menu [gamesradar-d2]
- Mein-MMO, Destiny sticky UI elements (GDC 2016): https://mein-mmo.de/en/destiny-von-klebrigen-ui-elementen,89554 [mmo-destiny]
- Kotaku, Evolution of Destiny's UI: https://kotaku.com/watch-the-evolution-of-destiny-s-user-interface-1782289001 [kotaku-destiny]
- Game Developer, Building the UI for Destiny (video): https://gamedeveloper.com/art/video-building-the-user-interface-for-bungie-s-i-destiny-i-
- UX Collective, Apex Legends ping system: https://uxdesign.cc/apex-legends-ping-system-gaming-ux-done-right-4661cd94954c [apex-ping]
- NME, Apex visual clutter: https://www.nme.com/news/apex-legends-developer-suggests-plan-to-tackle-visual-clutter-3133025
- Kotaku, MW2 menu complaints: https://kotaku.com/call-of-duty-mw2-modern-warfare-multiplayer-ui-menu-1849715947 [kotaku-mw2]
- GamingBolt, Spider-Man disables the HUD while traversing: https://gamingbolt.com/spider-man-ps4-will-disable-the-hud-while-you-traverse-the-city [spiderman]
- Can I Play That, Forza Horizon 5 accessibility menu: https://caniplaythat.com/2021/11/04/forza-horizon-5-accessibility-menu-deep-dive/ [fh5-a11y]
- Game Developer, Oil it or spoil it: https://www.gamedeveloper.com/design/oil-it-or-spoil-it- [oil]
- RPG Playground, Juice it or lose it summary: https://rpgplayground.com/research-making-a-juicy-game/
- Audiokinetic, UI audio from a UI design perspective: https://www.audiokinetic.com/en/approaching-ui-audio-ui-design-perspective-2 [audiokinetic]

Fetched, no usable content for this question:
- EA, Ask the devs (Need for Speed Unbound): https://www.ea.com/ea-studios/criterion-games/news/ask-the-devs-john
- Game Informer, Designing the look of Spider-Man (costume only): https://www.gameinformer.com/b/features/archive/2018/04/20/designing-the-look-of-spider-man.aspx
- GDC Vault, UI engineering patterns (Midnight Suns, members only): https://www.gdcvault.com/play/1029385/UI-Engineering-Patterns-from-Marvel
- Material Design states (JavaScript-only page): https://m2.material.io/go/design-states

Blocked from fetching (worth reading manually):
- Rauno Freiberg, Invisible Details of Interaction Design: https://rauno.me/craft/interaction-design
- Emil Kowalski, Great animations: https://emilkowal.ski/ui/great-animations
- Geist colours, typography and materials: https://vercel.com/geist/colors · https://vercel.com/geist/typography · https://vercel.com/geist/materials
