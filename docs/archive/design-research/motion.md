# Motion research: dynamic, fast and premium on a game's frame budget

Date: 2026-10-20. Input to design v2 (`docs/design/v2.md`, identity tokens in `docs/tokens.md` on
`feat/identity`). Builds on `docs/design/research.md` §1.6 and principle 9, and on live values
(`docs/protocol.md` §5.7: `NUI.stream` / `useFollow`).

**Evidence tags** (same as `research.md`):
- **[V]** verified this session from a fetched source (listed in Sources).
- **[R]** recalled from general knowledge (FiveM, Chromium, game UI). Check it.
- **[I]** inferred: a recommendation or a calculation of mine.

**What's thin.** Game studios publish little about UI motion with numbers. GDC session pages describe talks
and don't give specs, and I found no Riot, Respawn or Playground write-up with UI timings. Game-UI claims here are
mostly the transition-and-input argument (Hargreaves), the damage-trail health bar (gamedev.net) and Bungie's
cursor tuning (second-hand). The motion-system numbers (Material, Carbon, Apple) are solid. Nothing here has
been measured in FiveM yet. §5 lists what to measure.

---

## 0. The constraints that shape everything

1. **Chromium 103.** These are unavailable until Chromium 144:
   - `linear()` easing (Chrome 113) [V chrome-linear]. So no CSS springs.
   - Individual `translate`/`scale`/`rotate` (Chrome 104) [V web.dev transforms].
   - `@starting-style` and `transition-behavior: allow-discrete` (Chrome 117) [V chrome entry-exit].
   - Same-document View Transitions (Chrome 111) [V chrome view-transitions].

   What 103 does have:
   - The Web Animations API with `finished`/`ready` promises, replaceable animations, `commitStyles()`,
     `persist()` and composite modes. All of these shipped by Chromium 84 [V web.dev waapi].
   - Multi-stop keyframes.

   So a spring can still run on the compositor in 103: sample it into WAAPI keyframes [I]. Motion does exactly
   this ("pre-calculates physics-based keyframes") [V motion waapi].
2. **One renderer for every UI.** FiveM puts every NUI frame in one shared renderer process (measured in this
   repo, `docs/host.md`). A main-thread animation in one resource competes with every other UI's JS [I from that
   measurement].
3. **rAF runs at the game's frame rate** (140–300/s in FiveM, `docs/protocol.md` §5.7). A JS animation loop
   (react-spring, Motion's JS path, a hand-rolled tween) runs 2–5× more often than on a 60 Hz desktop. At
   144 fps the whole frame is 6.9 ms, shared with GTA [I].
4. **Off-screen rendering.** NUI runs CEF in OSR mode [V easyadmin]. Every frame the page produces has to be
   handed to the game, even a compositor-only opacity change. So "compositor-only" is cheaper but **not free**,
   and an idle animation loop (spinner, pulse, shimmer) costs frames forever [I, verify in game: §5].
5. **The existing rules stand.** No `transform` animation on centred dialogs, so animate an inner wrapper. No
   essential `:has()`. And `nk-enter` is opacity-only today (`kit.css`).

---

## 1. Principles

1. **Purposeful.** Motion explains a change: where it came from, what changed, what is now active. Nothing
   moves while nothing changes. Fluent puts it as motion that "serves a purpose" [V fluent]. Carbon keeps
   "expressive" motion for "occasional, important moments" and uses quiet "productive" motion for task work
   [V carbon]. For nuikit, HUD and menus are productive; only big moments (death, level-up, a server's own
   reward) get expressive motion [I].
2. **Fast.** Feedback ≤ 100 ms, panels 120–200 ms, full-screen ≤ 400 ms [V gamineai via research.md; Material:
   "desktop 150–200 ms" V m1]. Exits are faster than entrances (Material 225 → 195 ms) [V m1]. A player
   repeats a menu hundreds of times, and "after a while I will stop noticing your pretty transitions"
   [V hargreaves].
3. **Interruptible.** Input is never blocked by an animation. "From a logical point of view, new screens
   should become immediately active," and transitions overlap and reverse mid-flight [V hargreaves]. Every
   animation retargets from where it is now, keeping its velocity where it can. Springs do this naturally
   ("uses its current velocity as the starting velocity toward the new target") [V wwdc23].
4. **Physical.** Things that move use decelerating curves or critically damped springs. Linear is only for
   time itself: progress, countdowns, streamed values, rotation [V fluent, wwdc23]. Bounce is rare and small:
   about 0.15 reads "slightly bouncy", and above about 0.4 looks exaggerated for UI [V wwdc23]. Material 3's
   own springs are nearly critically damped (damping ratio 0.9 for spatial, 1.0 for effects) [V m3-android].
   By my calculation their overshoot is about 0.1%, invisible [I]. "Physical" means mass and deceleration, not
   wobble.
5. **Truth first, motion second** [I]. On the HUD the real value is shown immediately and motion only
   decorates it: a meter drops at once while a damage trail shows the loss. Motion never delays information
   the player is acting on.
6. **Cheap when idle** (research principle 14). No infinite animations on always-on surfaces. A finished
   animation leaves no layer, no timer and no rAF behind [I].

---

## 2. Motion tokens for nuikit

### 2.1 What the market uses (calibration)

| System | Durations | Enter / standard / exit easing | Springs |
|---|---|---|---|
| Material 3 [V m3-android] | short1–4: 50/100/150/200; medium1–4: 250–400; long: 450–600; extra-long: 700–1000 ms | standard `(0.2,0,0,1)`; emphasized decelerate `(0.05,0.7,0.1,1)`; emphasized accelerate `(0.3,0,0.8,0.15)`; standard accelerate `(0.3,0,1,1)` | fast/default/slow spatial: ζ 0.9, k 1400/700/300; effects: ζ 1, k 3800/1600/800 |
| Carbon [V carbon] | fast-01 70, fast-02 110, moderate-01 150, moderate-02 240, slow-01 400, slow-02 700 ms | productive: standard `(0.2,0,0.38,0.9)`, entrance `(0,0,0.38,0.9)`, exit `(0.2,0,1,0.9)`; expressive: `(0.4,0.14,0.3,1)` / `(0,0,0.3,1)` / `(0.4,0.14,1,1)` | none |
| Fluent 2 [V fluent] | No numbers on the page; scale with size and distance | ease-out to enter, ease-in to leave, linear for rotation | none |
| Apple / SwiftUI [V wwdc23] | perceptual `duration`, default 0.5 s | — | `duration` + `bounce`; k = (2π/duration)², mass 1. Presets smooth / snappy / bouncy are commonly given as bounce 0 / 0.15 / 0.3 at 0.5 s (from SwiftUI docs, not fetched: [R]) |

Converted to a perceived duration T = 2π/√k, Material's springs come out as follows [I, computed]:

| M3 spring | T | Settles within 0.5% by |
|---|---|---|
| fast spatial | 168 ms | 151 ms |
| default spatial | 237 ms | 211 ms |
| slow spatial | 363 ms | 320 ms |
| fast effects | 102 ms | 125 ms |
| default effects | 157 ms | 190 ms |
| slow effects | 222 ms | 267 ms |

That's the same band as nuikit's 140 ms base. A game UI wants the fast end of every system: desktop-style
timings, not mobile ones.

### 2.2 The token set

Everything derives from the two identity values a theme already has, `--nk-duration` and `--nk-ease`, plus
`--nk-motion`. **The compiler writes literal values** (as it does for other derived tokens). That avoids
relying on `calc()`/`min()` on `<time>` inside `animation` shorthands in 103 [I: probably fine, but a literal is
certain]. Every duration is × `--nk-motion` (the existing `--nk-time` pattern).

**Durations** (component tier; Graphite values with `--nk-duration: 140ms`):

| Token | Formula | Graphite | Use |
|---|---|---|---|
| `--nk-time-instant` | 0 | 0 ms | state that must be immediate (selection when key-repeat is held, §3.3) |
| `--nk-time-press` | 0.5 × d, ≥ 50 ms | 70 ms | press, toggle, key-chip flash |
| `--nk-time-hover` | 0.75 × d | 105 ms | hover and focus colour, row background |
| `--nk-time` (v1.1) | d | 140 ms | panel and menu enter, selection indicator, tab switch |
| `--nk-time-exit` | 0.7 × d | 100 ms | every exit: panel, toast, menu, modal |
| `--nk-time-move` | 1.5 × d, ≤ 300 ms | 210 ms | toasts entering, FLIP moves, meters gaining |
| `--nk-time-modal` | 1.25 × d | 175 ms | dialog enter (scrim 1.5 × d) |
| `--nk-time-screen` | 2.5 × d, ≤ 400 ms | 350 ms | full-screen enter (pause, death, loading) |
| `--nk-time-ambient` | fixed | 400 ms in, 3000 ms hold, 400 ms out | HUD show-on-change fades, damage trail (not scaled by identity) |
| `--nk-stagger` | 0.15 × d, ≤ 20 ms | 20 ms | per item; Material: "no more than 20ms apart" [V m1-choreo] |
| `--nk-stagger-max` | fixed | 100 ms | total stagger cap (items after the 5th enter together) |

**Easings** (cubic-bezier only until 144):

| Token | Graphite value | Use | Basis |
|---|---|---|---|
| `--nk-ease-out` (v1.1) | `cubic-bezier(0.2, 0.8, 0.2, 1)` | enter, hover, anything arriving | existing; close to Carbon productive entrance [V] |
| `--nk-ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | exit (speeds up as it leaves) | Carbon exit / M3 standard accelerate [V] |
| `--nk-ease-in-out` | `cubic-bezier(0.2, 0, 0, 1)` | on-screen moves (indicator, FLIP, tab underline) when not a spring | M3 standard [V] |
| `--nk-ease-emphasized` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | full-screen enter, big moments | M3 emphasized decelerate [V] |
| `--nk-ease-linear` | `linear` | progress, countdowns, streamed values, needles | Fluent [V] |

**Springs** (JS only, run as sampled WAAPI keyframes, §4.1). The token value is `<duration> <bounce>`, which
the compiler also writes as stiffness and damping (mass 1, k = (2π/T)², c = 4π(1 − bounce)/T [I, derived from
the stiffness formula in V wwdc23 and ζ = 1 − bounce]). The numbers below are my calculation [I]:

| Token | Graphite | Stiffness | Damping | Damping ratio | Overshoot | Settles (0.5%) | Use |
|---|---|---|---|---|---|---|---|
| `--nk-spring-snap` | `160ms 0` | 1542 | 78.5 | 1.0 | 0 | ~195 ms | selection indicator, tab underline, needle catch-up |
| `--nk-spring-move` | `240ms 0.1` | 685 | 47.1 | 0.9 | ~0.1% | ~215 ms | toasts in, FLIP reflow, sheet/drawer, digit roll |
| `--nk-spring-soft` | `360ms 0` | 305 | 34.9 | 1.0 | 0 | ~430 ms | full-screen content, map frame resize |
| `--nk-spring-pop` | `260ms 0.3` | 584 | 33.8 | 0.7 | ~4.6% | ~310 ms | rewards only: item-added tile, level-up, a "×3" dedupe badge |

`snap` and `move` sit within ~10% of Material's fast and default spatial springs, so they are calibrated, not
invented [I].

### 2.3 Choreography rules

- **Stagger.**
  - Only on the first open of a list or grid, and only for the first 5 items (20 ms apart, ≤ 100 ms total).
  - Never on updates, re-renders, filtering or keyboard navigation.
  - Never across more than one axis, and in one direction only (top to bottom) [V m1-choreo "keep the order in
    one direction"; Fluent: short offsets, account for the parent's timing V fluent].
  - Full-screen views stagger **groups**, not items: header, body, footer, 40 ms apart [I].
- **Enter / exit asymmetry.**
  - Enter: `--nk-time` with `--nk-ease-out`, opacity plus a small offset (4–8 px, from the anchor side).
  - Exit: `--nk-time-exit` with `--nk-ease-in`, **opacity only**, no stagger [V m1 exit faster; Carbon exit
    curve V].
  - An exit never delays what comes next: old and new overlap (cross-fade), and the new surface takes input on
    its first frame [V hargreaves].
  - Exception: a panel that leaves but stays nearby to be recalled (a side drawer) uses the standard curve
    [V carbon].
- **Layout change.**
  - Never animate `width`, `height`, `top`, `left`, `margin` or `padding`.
  - Moves and reorders use FLIP: measure first, apply last, invert with `transform`, play
    [V aerotwist-flip], over `--nk-spring-move`.
  - Size changes snap. If a panel must grow (an accordion), cross-fade the content and let the box jump, or
    clip with a transform-scaled mask. In Chromium 103 there is no cheap height animation [I].
  - FLIP scale distorts text, so translate only, unless the content is wrapped [V aerotwist-flip].
- **Shared element.** One element per surface carries continuity: the selection indicator (it moves; the rows
  don't), the active tab underline, the gauge needle. "Guide the user's focus to the next view using the most
  important shared element" [V m1-choreo]. True cross-view shared-element transitions (a slot icon flying into
  a detail panel) wait for View Transitions in Chromium 144 [I].
- **Interruption.**
  - Every animation must be retargetable: CSS transitions retarget natively. WAAPI springs re-sample from the
    current value and velocity (§4.1).
  - A close during an open reverses from the current frame. It doesn't finish the open first.
  - Escape and focus release happen at the start of an exit, not at its end [I; this matches the surfaces
    runtime's one-owner rule].
- **Distance and size.** Bigger and farther moves get more time, up to `--nk-time-screen` [V m1, fluent].
  Nothing in the kit travels more than 16 px except full-screen sheets [I].
- **One thing at a time.** Don't stack large translate + rotate + scale [V gamineai via research.md]. At most
  2 properties per element (opacity + one transform) [I].

### 2.4 Identities: snappy vs smooth

`--nk-duration` and `--nk-ease` already set an identity's character. Add an optional
`--nk-spring-bounce` (0–0.3, default 0) that the compiler folds into every spring token, so a theme sets
three values for its motion personality [I].

| Identity | Character | `--nk-duration` | `--nk-ease` (out) | Springs (snap / move / soft) | Bounce | Stagger | Signature |
|---|---|---|---|---|---|---|---|
| **Graphite** | Precise, quiet, snappy | 140 ms | `(0.2,0.8,0.2,1)` | 160 / 240 / 360 ms | 0 | 20 ms | indicator glides; numbers jump, deltas fade |
| **Signal** | Hard snap, street | 120 ms | `(0.1,0.9,0.2,1)`: fast attack, short tail | 130 / 200 / 300 ms | 0 | 15 ms | entries slide 12 px from the side; rows `fill` swaps with no glide (instant, `--nk-time-instant`); bars fill linearly |
| **Velvet** | Smooth, luxury | 240 ms | `(0.32,0.72,0,1)`: long glide in | 260 / 340 / 420 ms | 0.1 (pop 0.3) | 30 ms | cross-fades longer, digits roll, the pill indicator springs with a hint of bounce |
| **Vector** | Instrument, digital | 140 ms | `(0.4,0,0.2,1)` | 140 / 200 / 300 ms | 0 | 20 ms | values tick in steps (`steps()` easing on segments), a 100 ms brand flash on change instead of movement; needle has no overshoot |

All four obey the same ceilings (feedback ≤ 100 ms, panel ≤ 240 ms, screen ≤ 400 ms). Velvet's 240 ms is
the slowest panel the kit allows [I]. The compiler should warn above `--nk-duration: 260ms`, as it does for
surface-opacity floors.

---

## 3. Patterns per surface

All specs are for Graphite. Other identities scale by their tokens. "Compositor" means `transform`/`opacity`
only.

### 3.1 HUD value changes

| Value | Spec |
|---|---|
| **Streamed** (speed, RPM, heading, progress rings fed from Lua) | `useFollow` only (§5.7 glide). Set `transition: none` on the painted property: a CSS transition on top of the glide double-smooths and lags. Paint `transform` (needle `rotate`, compass ring) or `textContent` through refs. Never React state per frame [protocol V repo]. |
| **Discrete numbers** (cash, bank, ammo) | The number changes **at once** (truth first). A delta chip (`+$250`, `−1`) enters with opacity + 4 px rise over `--nk-time`, holds 1.5 s, and exits over 200 ms. A count-up is allowed only for money gains ≥ 10× the smallest unit, over ≤ 400 ms at ≤ 30 text updates/s, in `--font-numeric` tabular so the width never changes [I]. |
| **Digit roll** (Velvet/Signal option) | Each digit is a 0–9 strip in a clipped cell, moved by `translateY` over `--nk-spring-move`. Compositor-only, ≤ 7 digits, changes ≤ 1/s; otherwise jump. Reduced motion: jump [I]. |
| **Meters** (health, armor, hunger, fuel) | The fill is `transform: scaleX(v)` from the left, never `width` (today `meter.tsx` animates `width`: change it). **Loss:** the fill drops instantly. A trail layer (the fill colour at 40%) stays at the old value for 300 ms, then shrinks over 400 ms `--nk-ease-in-out`. A further hit during the trail restarts the hold without jumping the trail [V gamedev.net technique; timings I]. **Gain:** the fill grows over `--nk-time-move` `--nk-ease-out`, with no trail. Segmented (Vector): segments switch with `steps(n)`. |
| **Show on change** (vitals pills, status dots) | Enter: opacity 0 → 1 over 140 ms, plus a 4 px slide from the cluster edge. Hold 3 s after the last change. Exit: 400 ms `--nk-ease-in-out` (ambient fades are the one exit slower than its entrance: the player is not waiting on it) [I]. Below a threshold the pill stays. |
| **Crossing a critical threshold** | **One** attention cue, then steady: 2 opacity blinks (1 → 0.4 → 1, 2 × 300 ms) and the colour change. No infinite pulse on the HUD, because every animated frame is an OSR frame (§0.4) [I]. A server that wants a heartbeat pulse gets it as an opt-in, and it stops when the vital recovers. |
| **Telltales** (seatbelt, engine, lights) | On: opacity 0 → 1 over `--nk-time-press`. Off: over `--nk-time-exit`. Indicators blink at the game's rate with `steps(1)` keyframes (500 ms on, 500 ms off), and only while the indicator is on [I]. |
| **Gear, shift light** | The gear changes instantly, with a 70 ms brand flash. The shift light is on/off with no fade (it's a timing cue) [I]. |

### 3.2 Notifications (toasts, item slabs)

- **Position.** One stack, anchored to its screen edge (research §4). New items enter at the anchor edge.
- **Enter.** Opacity 0 → 1, plus `translateX(16px → 0)` from the screen edge, or `translateY(8px → 0)` for a
  stack above the minimap. Use `--nk-spring-move` via WAAPI, or the CSS fallback `--nk-time-move` with
  `--nk-ease-out`.
- **Item slab** (item added). The icon tile uses `--nk-spring-pop` scale 0.9 → 1 (a reward moment). The delta
  fades in 60 ms later.
- **Stacking.** Existing toasts FLIP-move by the new toast's height over `--nk-spring-move`: transform only,
  measured once per change.
  - At most 4 visible. The 5th oldest exits.
  - Duplicates don't add a row. The count badge updates (`×3`) with `--nk-spring-pop` scale 1 → 1.12 → 1 and
    the timer restarts.
- **Exit** (timeout or dismissal). Opacity → 0 over `--nk-time-exit` `--nk-ease-in`, with an optional 8 px
  drift toward the edge. Then siblings close the gap with FLIP. The exit and the gap close overlap: the gap
  starts 50 ms into the exit [I].
- **Timer bar.** One WAAPI `scaleX(1 → 0)` animation, `linear`, lasting the toast's duration. Pausing it
  (hover, or the paused prop) is `animation.pause()`. No interval ticks [I].
- **Timing.** 4–6 s default, 2–3 s confirmations, sticky for actionable ones (research §3).
- **Sonner today.** The kit's `NuiToaster` is stock Sonner. It already animates with transforms and
  transitions [R]. Check that it honours `data-nk-motion` (the kit's global kill does reach CSS transitions)
  and that its swipe and stack measuring doesn't thrash with 4 toasts at 144 fps (§5).

### 3.3 Menus and lists

- **Selection indicator** (the signature move).
  - **One** absolutely positioned element per list, behind the rows. It moves with
    `transform: translateY(row.offsetTop)` and `scaleY` only if row heights differ.
  - The `bar` style moves the bar, `fill` moves the fill block, and `outline` moves the outline: the row
    tokens already define all three.
  - Motion: a CSS transition over `--nk-time` with `--nk-ease-in-out`. It retargets natively mid-flight, which
    is enough for a single move. A WAAPI `--nk-spring-snap` keeps velocity when a move is interrupted.
  - **Key-repeat rule.** When moves arrive faster than the duration (a held d-pad, ~30/s), each move uses
    `--nk-time-press`. Past 3 rapid moves, the indicator jumps (`--nk-time-instant`) and glides only for the
    last one. The indicator must never trail the focused row by more than one row [I].
  - Row offsets are read once on open and on `ResizeObserver`, never per move.
  - Today `nk-row` fades its own `::before` per row. That stays as the reduced-motion and no-JS fallback.
- **Hover.** Background and colour change over `--nk-time-hover` `--nk-ease-out`. The indicator does **not**
  follow mouse hover unless the row is also focused (one active row, not two) [I].
- **Press.** On `:active` (inner content wrapper, not the centred surface): `transform: scale(0.98)` over
  `--nk-time-press` and back on release. Or, for Signal and Vector, a background flash with no scale [I].
- **Submenu push / back.**
  - The new list enters with opacity plus `translateX(12px → 0)` over `--nk-time`. The old list exits with
    opacity → 0 over `--nk-time-exit`. Both start together.
  - Back mirrors the direction: enter from −12 px.
  - The header title cross-fades.
  - The new list takes keys on frame 1 [V hargreaves].
- **Open.** The panel uses `nk-enter` (opacity) plus a 4 px offset from the anchor side on an inner wrapper.
  First 5 rows stagger at 20 ms (first open only).
- **Context menu / target eye / radial.**
  - Open from the origin with opacity plus scale 0.96 → 1, `transform-origin` at the anchor, over
    `--nk-time`.
  - Radial segments don't stagger. The hovered segment's highlight moves like the indicator: a rotation on
    one element.

### 3.4 Modals and full-screen screens

- **Dialog.**
  - Enter: the scrim fades 0 → `--scrim` alpha over 1.5 × `--nk-time`. The dialog's **inner wrapper** (never
    the centred element) gets opacity plus scale 0.97 → 1 over `--nk-time-modal` `--nk-ease-out`.
  - Exit: opacity only over `--nk-time-exit`, and the scrim fades out over the same time.
  - Focus is in the dialog on frame 1.
  - shadcn's `zoom-in-95`/`slide-in` classes from tw-animate-css (24 uses in `vendor/shadcn/ui`) write
    `transform` on the content element. The kit must keep neutralising those on centred parts, or apply them to
    a wrapper [I, from the repo rule].
- **Confirm (destructive).**
  - Hold-to-confirm fills a ring or line linearly over the hold time (0.6–1.2 s, research §3) with WAAPI. On
    release before the end, it reverses at 2× speed from its current point (`animation.playbackRate = -2`) [I].
- **Full-screen** (pause, death, loading).
  - Enter: the backdrop fades over `--nk-time-screen` `--nk-ease-emphasized`. Then the content groups (header,
    body, footer) fade with an 8 px rise, 40 ms apart, over `--nk-spring-soft`. Total ≤ 400 ms.
  - Exit: everything fades over 150 ms together. Players leave pause to play: never make them wait [I].
  - **Tabs** (pause). The underline moves as a shared element (`--nk-spring-snap`), and the panes cross-fade
    over `--nk-time-hover`: no sliding panes, because a slide repaints the full screen [I].
  - **Death.** The band and timer fade in over 400 ms. The game-side desaturation or blur is the owning
    resource's job (research principle 7). The respawn action appears with `--nk-spring-pop` when it becomes
    available: the one expressive moment.
  - **Loading.** No looping video or shimmer at full screen. If the progress is real, show it as a linear
    `scaleX`. Rotate tips by cross-fade every 6–8 s [I].

### 3.5 Progress, skill check and countdown urgency

- **Progress line / ring (timed).** One WAAPI animation for the whole run: `scaleX` for a line, or
  `stroke-dashoffset` for a ring (a small SVG paint per frame, acceptable at ≤ 64 px). Use `linear` over the
  task's duration. `onComplete` stays on its own timer (as `meter`/`progress-ring` already do). Pause and
  resume use `animation.pause()` / `play()`.
  - Today `progress-ring` steps every 100 ms with a matching transition. That works, but it costs 10 React
    renders a second. Move it to one compositor animation [I].
- **Cancel.** The line turns `--destructive` and fades out over 200 ms. Never animate the bar back to zero.
- **Complete.** A 100 ms brand flash on the line, then the slab exits.
- **Skill check.**
  - The hand rotates as one WAAPI `rotate` animation, `linear`, on the compositor. The hit test reads
    `animation.currentTime` on the key press, so the angle is exact without a per-frame rAF.
  - Today `skill-check.tsx` drives the hand with `requestAnimationFrame` and `setAttribute` every frame at the
    game's frame rate. Move it [I].
  - **Hit:** the zone flashes `--success` (opacity 1 → 0.6 → 1, 120 ms) and the next round starts at once.
  - **Miss:** 3 shakes of ±4 px over 180 ms (`translateX`), plus a `--destructive` flash.
  - **Reduced motion:** the flash only.
- **Countdown urgency.**
  - Normal: digits change in place (tabular, no motion).
  - At `warnAt` (default 10 s): the numeral turns `--warning`.
  - In the last 5 s: `--destructive`, and on each second tick a scale 1.06 → 1 over 160 ms `--nk-ease-out` on
    the numeral's wrapper.
  - At 0: a single `--nk-spring-pop` on the outcome.
  - Ticks come from the timer, never from an animation loop.
  - Reduced motion: colour only [I; WCAG treats colour and opacity changes as non-motion V wcag233].

---

## 4. Implementation for nuikit's React kit under Chromium 103

### 4.1 Library or none: none for the kit, plus a ~1.5 kB `nuikit-core/motion`

| Option | Size | How it runs in 103 | Verdict |
|---|---|---|---|
| **Motion / framer-motion** | `motion` component ≥ 43 kB; `m` + `LazyMotion` ~5 kB initial + 24 kB (`domAnimation`) or 38 kB (`domMax`); `useAnimate` mini 3.3 kB (WAAPI only), hybrid 23 kB [V motion bundle] | WAAPI where it can. Springs on WAAPI use `linear()` "in modern browsers, with a safe fallback in older browsers" [V motion waapi]. The fallback isn't documented. Its JS path runs on the main thread: "always run on the main JS thread" [V motion perf] | **No for the kit.** Every UI would bundle it; the main-thread path runs at 140–300 Hz in the shared renderer. It's fine in a bespoke screen that wants layout animations, measured. |
| **react-spring** | 19.6 kB gz (`@react-spring/web` 10.1.2) [V depscope] | rAF loop on the main thread for every frame of every animation [R] | **No.** It's exactly the per-frame JS the protocol warns against. |
| **AutoAnimate** | < 3 kB [V pkgpulse] | MutationObserver + FLIP with WAAPI; respects `prefers-reduced-motion` [V autoanimate, pkgpulse] | **Maybe**, for the toast stack and inventory lists. It must also be disabled on `data-nk-motion="off"` (it doesn't know `--nk-motion`). It measures every child per mutation, so keep it to short lists [I]. |
| **Plain CSS** (transitions + keyframes) | 0 kB | Compositor for transform/opacity [V web.dev compositor]; transitions retarget natively | **Default for ~90%**: hover, press, enter, exit, fades, the indicator. |
| **WAAPI direct** | 0 kB | Compositor for transform/opacity, promises, `pause`/`reverse`/`currentTime`, multi-stop keyframes [V web.dev waapi] | **For springs, FLIP, timed progress and skill check**, wrapped by a small helper. |

**Recommendation** [I]: CSS for everything stateful, and a tiny `nuikit-core/motion` (no dependencies) for the
rest:

- `spring(preset)`: reads the compiled `--nk-spring-*` tokens once per theme or prefs message, then samples the
  spring at 60 Hz until it settles (~12–25 keyframes) and caches the result per preset and distance class.
  `element.animate(keyframes, { duration: settle, easing: "linear" })` runs on the compositor, which is the 103
  substitute for `linear()`.
- `retarget(el, prop, to, preset)`: the value and velocity come **analytically** from the running spring's
  elapsed time (no `getComputedStyle` read). It cancels the old animation and starts a new spring from that
  value and velocity. This is the interruptibility springs promise [V wwdc23], without a JS frame loop.
- `flip(container, mutate)`: read every child's rect in one pass, run `mutate`, read again in one pass, then
  animate the deltas with `transform` (FLIP [V aerotwist-flip]). Reads are batched before writes
  [V web.dev layout].
- `timed(el, keyframes, ms)`: one linear animation for progress, timer bars and the skill-check hand, exposing
  `pause`, `play`, `reverse` and `currentTime`.
- React: `useSpring(ref, value, preset)` and `useFlip(ref, deps)`. Neither sets React state during an
  animation.
- **Chromium 144 path:** the same tokens compile to CSS `linear()` springs, `@starting-style` enters,
  individual `translate`/`scale` (no wrapper juggling), and View Transitions for shared elements. The helper
  keeps its API and drops code.

### 4.2 Honouring `--nk-motion` and reduced motion

- **Two levels, not one** [I, proposal]:
  - `--nk-motion: 0` from a theme means **off**: the kit's existing `html[data-nk-motion="off"]` kill
    (0 s on every animation and transition) stays.
  - The player's `reducedMotion` pref should mean **reduced**: no movement (translate, scale, rotate, digit
    rolls, shakes, FLIP, stagger) but short opacity and colour fades kept at ≤ 100 ms. WCAG 2.3.3 counts
    "changes of color or opacity" as non-motion [V wcag233], and an instant swap is harsher for orientation than
    a 100 ms fade.
  - Add `data-nk-motion="reduced"` and a `--nk-motion-move: 0` token. Movement durations multiply
    `--nk-motion-move`, and fades multiply `--nk-motion`. The prefs message is unchanged (`reducedMotion`); only
    what `applyTheme` sets changes.
- **CSS.** Every kit duration is `× --nk-motion` (already true of `--nk-time`). Movement keyframes live under
  `html:not([data-nk-motion="reduced"])`. Keep `@media (prefers-reduced-motion: reduce)` as a second input
  [V wcag233 C39]. Whether CEF passes the OS setting through in FiveM is unknown, so verify it (§5).
- **JS.** `nuikit-core/motion` reads the motion level from the same prefs and theme messages, not with a
  `getComputedStyle` per animation. When reduced, `spring`, `flip` and `retarget` jump to the end state (or
  fade for enters), and `timed` still runs, because progress is information, not decoration.
- **Third-party.** AutoAnimate: call `disable()` when reduced. Sonner: the global kill covers its CSS.

### 4.3 Avoiding layout thrash

- **Animate only `transform` and `opacity`** [V web.dev compositor: "only two properties"].
  - `background-color` and `color` transitions on small rows are fine (one small paint).
  - `box-shadow`, `filter`, `clip-path`, `border-radius` and `width`/`height` never animate. Shadows and
    radii "require a potentially expensive paint" [V motion perf].
  - `--nk-cut` panels use `clip-path`, so animating a cut panel's transform is fine, but don't animate the
    path.
- **No CSS-variable animations.** "Animating a CSS variable isn't hardware accelerated" [V motion perf]. Set
  transforms directly, not `--x`.
- **Reads before writes, once per change.** No `offsetTop`/`getBoundingClientRect` after a style write in the
  same task [V web.dev layout]. Indicator offsets are cached and refreshed by `ResizeObserver`.
- **Stable boxes.**
  - Numbers in tabular `--font-numeric`. Changing text never changes width.
  - `contain: layout paint` on HUD clusters, toast items and the indicator's list, so a change stays local
    [R: `contain` shipped in Chrome 52].
- **No React per frame.** Streamed values paint through refs (§5.7). Timers drive React at ≤ 10 Hz.
  Animations never set state.
- **`will-change`** [V mdn will-change, web.dev compositor]:
  - Not in stylesheets for whole classes. MDN calls it a "last resort", and overuse "can cause the page to
    slow down".
  - Permanent `will-change: transform` only on the few persistent movers: the selection indicator, the
    needle and compass ring. That's ≤ 6 per UI [I].
  - Transient ones are set at animation start and cleared on `finished`. WAAPI promotes the animated element
    for the duration anyway [R].

### 4.4 Perf budget per animation [I]

The frame at 144 fps is 6.9 ms, and the game needs most of it. RAIL's "produce each frame in 10 ms or less"
assumes the browser owns the frame [V rail]; here the page gets a slice of it.

| Item | Budget |
|---|---|
| Idle (nothing changing) | **0 animation frames produced.** No infinite animations, no running timers or rAF |
| Start cost (JS + style + layout to kick off one animation) | ≤ 0.5 ms main thread, once |
| Per frame, compositor animation (CSS or WAAPI on transform/opacity) | 0 ms main-thread script; no style recalc or layout in the trace |
| Per frame, `useFollow` paint | ≤ 0.1 ms per followed value (one transform or text write) |
| Per frame, whole page while animating | ≤ 1.5 ms main thread (style + layout + paint + script), at 2560×1440 |
| Concurrent animations per UI | ≤ 8 (a menu open with stagger is 6) |
| Area repainted per frame | ≤ 10% of the screen, except full-screen transitions (≤ 400 ms, then 0) |
| Duration ceilings | press ≤ 100 ms, panel ≤ 240 ms, full-screen ≤ 400 ms, ambient HUD fade ≤ 400 ms |
| Composited layers per UI at idle | ≤ 12 |
| Library weight for motion per UI | ≤ 2 kB gz (the helper) |
| Game cost | no measurable change in game frame time (≤ 0.1 ms p95) during a menu open or a toast compared with idle; resmon unchanged (motion is page-side, never Lua) |

### 4.5 How to measure it

- **Browser** (CI-able, Playwright with Chromium at `/opt/pw-browsers/chromium`):
  - Drive each pattern with `postMessage` fixtures (as the repo already does) and record a
    `Tracing.start` trace.
  - Assert, during the animation: no `Layout` and no `UpdateLayoutTree` per frame for compositor patterns;
    main-thread time per frame under budget; `document.getAnimations().length` returns to 0 within 500 ms
    of the last change (idle = no animations).
  - Run under 4× CPU throttle, at 1280×720, 1920×1080 and 2560×1440.
  - DevTools Rendering: Paint flashing (only the animated element flashes), Layer borders (layer count), Frame
    rendering stats.
  - Long tasks via `PerformanceObserver({ type: "longtask" })`, which exists in 103. The Long Animation Frames
    API needs Chrome 123, so it waits for 144 [R].
- **In game** (Qbox test server, prerelease):
  - Game frame time with `cl_drawPerf`/`profiler record` and the FiveM profiler view, in three runs: idle HUD,
    menu open + navigate for 10 s, 4 toasts stacking. Compare the p50 and p95 frame times [R: FiveM profiler
    commands; verify the names].
  - NUI DevTools (`nui_devtools` in F8, or the remote devtools port) for a Performance recording inside the
    real CEF [R].
  - Resmon to prove motion adds no Lua cost.
  - Publish the numbers in the PR, as the host benchmark did.

---

## 5. What to verify in game

1. **Is an OSR frame free when nothing animates?** Does an idle page produce no frames, and does one running
   opacity animation cost measurable game frame time? This decides how strict "no idle animation" must be.
2. **Compositor animations in FiveM's CEF.** Do `transform`/`opacity` animations stay smooth when the page's
   main thread is busy (simulate a 50 ms task during a toast enter)? This tests whether FiveM's CEF composites
   on its own thread in OSR mode.
3. **The rAF rate and WAAPI timing.** Is a WAAPI animation sampled at the game's frame rate (140–300) or capped
   at CEF's OSR rate? CEF's windowless default is 30 and its max 60 [V cef]; FiveM evidently raises it
   (§5.7 measured rAF at the game rate). Check that a 160 ms spring doesn't look stepped at 60 or 30.
4. **Sampled-spring keyframes vs CSS easing.** Compare `--nk-spring-snap` (sampled WAAPI) and
   `cubic-bezier(0.2,0,0,1)` side by side on the selection indicator at 144 fps. If nobody can tell, the
   kit can drop springs until 144.
5. **Indicator under key-repeat.** Hold the d-pad on a 20-row menu. The indicator must never trail by more than
   a row, and the key-repeat rule (§3.3) must feel right.
6. **Reduced-motion inputs.** Does CEF in FiveM report the OS `prefers-reduced-motion`? Does `/nuikit motion
   off` reach every UI, including handshake-off overrides? Does the proposed "reduced" level feel right?
7. **Text during motion.** Do translated or scaled text panels (toasts sliding, dialog scale 0.97) stay crisp,
   or blur at 1280×720 and 2560×1440?
8. **Meter trail and threshold blink** over a bright scene: readable, and not mistaken for damage flicker?
9. **Sonner in 103 at 144 fps** with 4 stacked toasts: no thrash, honours `data-nk-motion`.
10. **Cost of the skill check and progress ring** after the move to WAAPI vs today's rAF and 100 ms steps:
    main-thread time and game frame time.
11. **Identity feel.** Run the same menu, toast and dialog in Graphite, Signal, Velvet and Vector with
    `nuikit theme reload`. Do snappy and smooth read as intended, and is Velvet's 240 ms still "fast"?
12. **Layer count and memory** with the HUD, a menu and toasts open: FiveM browser memory before and after
    (the `docs/host.md` method).

**What would change this plan.**
- If (1) shows idle frames are free and running animations cost nothing measurable, the "no infinite
  animation" rule relaxes to "opt-in".
- If (2) shows compositor animations jank with the main thread, the kit should go even more CSS-only and drop
  JS springs.
- If (4) shows nobody can tell springs from curves, springs wait for 144.

---

## Sources

Fetched and used:
- Material Components Android, Motion theming (M3 springs, durations, easings): https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md
- Material Design (v1), Duration and easing: https://m1.material.io/motion/duration-easing.html
- Material Design (v1), Choreography: https://m1.material.io/motion/choreography.html
- IBM Carbon, Motion overview: https://carbondesignsystem.com/elements/motion/overview/
- Microsoft Fluent 2, Motion: https://fluent2.microsoft.design/motion
- WWDC23 "Animate with springs" (notes): https://wwdcnotes.com/notes/wwdc23/10158
- WWDC23 "Animate with springs" (Apple, transcript): https://developer.apple.com/videos/play/wwdc2023/10158/?time=1080
- Josh W. Comeau, A friendly introduction to spring physics: https://joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/
- Motion, Reduce bundle size: https://motion.dev/docs/react-reduce-bundle-size
- Motion, Performance: https://motion.dev/docs/performance
- Motion, Improvements to the Web Animations API: https://motion.dev/docs/improvements-to-the-web-animations-api-dx
- Motion, spring: https://motion.dev/docs/spring
- depscope, @react-spring/web size: https://depscope.dev/pkg/npm/@react-spring/web
- PkgPulse, Framer Motion vs Motion One vs AutoAnimate: https://www.pkgpulse.com/guides/framer-motion-vs-motion-one-vs-autoanimate-2026
- AutoAnimate: https://auto-animate.formkit.com/
- Chrome for Developers, linear() easing: https://developer.chrome.com/docs/css-ui/css-linear-easing-function
- Chrome for Developers, Entry/exit animations (@starting-style): https://developer.chrome.com/blog/entry-exit-animations
- Chrome for Developers, Same-document view transitions: https://developer.chrome.com/docs/web-platform/view-transitions/same-document
- web.dev, Individual transform properties: https://web.dev/articles/css-individual-transform-properties
- web.dev, Web Animations API improvements in Chromium 84: https://web.dev/articles/web-animations
- web.dev, Stick to compositor-only properties and manage layer count: https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count
- web.dev, Avoid large, complex layouts and layout thrashing: https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing
- web.dev, RAIL: https://web.dev/articles/rail
- MDN, will-change: https://developer.mozilla.org/docs/Web/CSS/will-change
- Paul Lewis, FLIP your animations: https://aerotwist.com/blog/flip-your-animations/
- W3C, Understanding SC 2.3.3 Animation from Interactions: https://w3c.github.io/wcag/understanding/animation-from-interactions
- Shawn Hargreaves, Transitions concluded: there is no spoon: https://www.shawnhargreaves.com/blog/transitions-concluded-there-is-no-spoon.html
- gamedev.net, Healthbars and such (damage trail): https://www.gamedev.net/blog/2391/entry-2262931-healthbars-and-such/
- Mein-MMO on Bungie's GDC 2016 Destiny UI talk (second-hand): https://mein-mmo.de/en/destiny-von-klebrigen-ui-elementen,89554
- Game Developer, Is your game juicy enough (GDC Europe 2013): https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough-
- Riot Games Technology, Architecture of the League Client Update (CEF): https://technology.riotgames.com/node/40
- GDC Vault, UI Engineering Patterns from Marvel's Midnight Suns (description only): https://gdcvault.com/play/1028880/UI-Engineering-Patterns-from-Marvel
- EasyAdmin docs, NUI known issues (OSR mode): https://easyadmin.readthedocs.io/en/8.0a3/nui/known-issues/
- CEF `windowless_frame_rate` reference: https://opendlang.org/library/arsd.webview.cef_browser_settings_t.windowless_frame_rate.html
- Gamineai, Game UI animation (via `docs/design/research.md`): https://gamineai.com/blog/game-ui-animation-creating-smooth-engaging-interface-transitions

In this repo: `docs/protocol.md` §5.7 (rAF at the game's rate, per-message cost), `docs/host.md` (one shared
renderer process), `packages/create-nuikit/kit.css` on `feat/identity` (`--nk-time`, `nk-enter`, the
reduced-motion kill), `registry/nuikit/ui/{meter,progress-ring,skill-check,speedometer,nui-toaster}.tsx`.

Blocked from fetching (worth reading manually):
- Material 3, Easing and duration tokens: https://m3.material.io/styles/motion/easing-and-duration/tokens-specs (the
  same values were read from the Material Components Android doc above)
- GDC Vault talk videos (Apex Legends animation summit, Destiny UI): only session pages and press summaries were
  reachable.
