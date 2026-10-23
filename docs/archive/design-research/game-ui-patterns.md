# Research: game UI patterns and systems for nuikit

Date: 2026-10-20. Question: which interaction patterns and UI *systems* should nuikit adopt so a server gets
premium, coherent game UI by default? Builds on `docs/design/v2.md` (identity tokens, flagship HUD, the
utilitarian baseline), `docs/design/research.md` (the premium FiveM bar, accessibility floors, specs) and
`docs/architecture.md` (intents, services, renderers). This doc doesn't repeat those. It adds the
**systems** layer: the shared behaviour that makes 30 scripts feel like one game.

**Evidence tags** (same as `research.md`):
- **[V]** verified this session from a fetched source (listed in Sources).
- **[R]** recalled from general knowledge of GTA V, FiveM or the games industry. Not fetched this session.
  Check it before building on it.
- **[I]** inferred: my recommendation or calculation.

**What's thin.**
- GDC Vault pages show abstracts only. The talks themselves are members-only, so talk claims are limited
  to what the abstracts and press write-ups say.
- PlayStation's developer accessibility guidelines aren't public (they sit behind the partner portal). Only
  Xbox's XAG and the Game Accessibility Guidelines (GAG) were usable.
- citizenfx native docs on GitHub were blocked from fetching. Native names below are [R] unless a fetched
  FiveM page names them.

**The one rule for every section.** Take the *convention*, never the *expression*. Hold-to-confirm, radial
menus, rarity tiers and device frames are genre language. A specific game's or server's art, layout, icons,
sounds or phone app designs are not ours to copy (`research.md` §5).

**How nuikit can provide something** (used in every "nuikit" line below):
- **component**: a registry item (`registry/nuikit/ui`);
- **service**: runtime-owned shared state with one owner (like surfaces);
- **token**: an identity or component token (`v2.md` §1);
- **intent**: a versioned schema scripts call (`architecture.md` §2);
- **pref**: a per-player preference (`protocol.md` §7.3).

**Cost model these sections assume** [V repo `docs/protocol.md` §5.7, measured]:
- Every Lua → page message costs the game frame it lands in (about 0.3 ms). Every page → Lua callback costs
  more (about 0.5 ms).
- `requestAnimationFrame` in FiveM fires at the game's frame rate (140–300 a second).
- So every system below is **event-driven**. A gliding value goes through `NUI.stream` (≤30 Hz), and only
  the 3D pins that must lock to the camera pay per-frame messages.

---

## 1. Input-agnostic focus and navigation

### 1.1 One focus model for mouse, keyboard and gamepad

**Pattern.** A single "current element" that every input moves:
- The mouse hovers and sets it.
- Arrows, WASD and the d-pad move it spatially.
- Tab moves it in reading order.
- Enter / A activates it. Escape / B goes back.

Hover and focus are the same visual state, so switching device mid-menu never leaves two highlights.

**Why it works.**
- XAG requires UI that is "fully navigable with keyboard and controller digital input alone", with
  single, non-simultaneous presses [V XAG 107, 112].
- Steam's golden rules say not to block one input type when another is detected: gamepad and
  mouse/keyboard should work at the same time [V Steamworks].
- Unreal's CommonUI moves a synthetic cursor onto the focused widget, so hover effects show with a gamepad
  too. That is one highlight for both inputs [V CommonUI input guide].

**Specs.**
- **Focus indicator.** Always visible, and never only a subtle glow. Use an outline plus a fill change,
  optionally plus a weight change [V XAG 113]. nuikit: a 2 px ring at `--brand` with a 2 px offset, plus
  the row's `--accent` fill (`research.md` §3).
- **Starting focus.** A dialog opens on its first interactive control. Focus can't leave the dialog while
  it's open [V XAG 113].
- **Wrapping.**
  - Linear lists wrap (past the last item back to the first).
  - 2D grids don't wrap.
  - A pref turns wrapping off everywhere [V XAG 112].
- **Order.** Order follows meaning, else visual layout, and recomputes when scale or resolution changes the
  layout [V XAG 112].
- **Same way in, same way out.** The input that moved focus into an element moves it back out. If a
  different key is needed (Escape out of remapping), the UI shows that key [V XAG 112].
- **Key repeat.** Held-direction repeat starts after 350–400 ms, then fires every 80–120 ms, and speeds up
  in long lists [I, common console feel; tune in game].
- **Pointer actions.** Activate on release (up), not on press (down), except time-critical actions, so a
  press can still be cancelled [V XAG 107].

**nuikit.**
- **Service + core hook.** `nuikit-core` adds focus scopes (`useFocusScope({ wrap, restore, trap })`) and a
  `data-nk-focused` attribute that hover and keyboard both set. Components style that one state.
- **Token.** `--nk-focus-ring-width`, `--nk-focus-ring-offset`, `--nk-focus-ring-color` (default
  `--brand`), as component tokens.
- **Chromium 103.** `:focus-visible` exists (86+) and `inert` exists (102+) [R]. Use `inert` on the
  covered layers of a stack instead of JS focus traps where possible. Don't depend on `:has()` for focus
  styling (repo rule).

### 1.2 Spatial navigation

**Pattern.** Directional input moves focus to the nearest element in that direction. "Nearest" is a
geometric score, not DOM order.

**Why it works.**
- It works on any layout (grids, two-pane inventories, radial menus, settings with side panels) with no
  per-screen wiring.
- TV platforms use the same model: Norigin's library and the CSS Spatial Navigation draft.

**Specs.** The algorithm follows the CSS Spatial Navigation draft and Norigin's documented approach
[V css-nav-1, V Norigin]:
1. Take the candidates in the pressed direction.
2. Prefer "insiders", which overlap the origin on the perpendicular axis.
3. Score the rest by primary-axis distance, plus a weighted perpendicular-axis penalty, minus an alignment
   bonus.
4. Break ties by DOM order.

Two more rules from the draft:
- **Containers.** `spatial-navigation-contain` keeps arrow moves inside a container (a grid, a tab
  panel) until there's nothing left in that direction.
- **Scrolling.** `spatial-navigation-action: auto` scrolls a container when no visible candidate lies in
  that direction.

The CSS draft is an Editor's Draft with at-risk parts. No browser support was stated in the source [V], so
**nuikit implements it in JS** and doesn't rely on a browser flag [I].

Cost: geometry is read only on a key press (one `getBoundingClientRect` pass over the scope's candidates),
never per frame [I]. A scope with 200 slots is about 200 rect reads per press, which is fine.

**nuikit.** **Core module** `nav` (about 2–3 KB) [I]:
- `data-nk-nav="grid|list|free"` on containers, matching the draft's `contain` and `grid` function;
- a `contain` flag;
- per-scope scoring.

Components (menu-row lists, item-slot grids, radial, tabs) declare their scope, so a third-party UI
built from the kit gets d-pad support for free.

### 1.3 Focus memory

**Pattern.** Each container remembers its last focused child.
- Coming back to a list, a tab or a parent menu lands where you left.
- Closing a dialog returns focus to the control that opened it.

**Why it works.**
- CommonUI keeps breadcrumbs and history so "focus can return to the correct element after a popup or
  overlay closes". Lower layers stay alive and resume input when the top layer goes [V CommonUI overview].
- Norigin calls this `saveLastFocusedChild` [V].

**Specs.**
- Remember per scope key (stable ids, not indices, so a re-sorted inventory doesn't jump).
- Fall back to the nearest surviving sibling when the remembered item is gone [I].
- Keep memory for the life of the surface. Optionally persist it per session for menus players reopen
  often (garage, shop) [I].

**nuikit.** Part of the focus scope (`restore: 'last' | 'first' | id`). The **surfaces service** already
owns the stack and Escape (`protocol.md` §3.5). It also records the focused element on push and restores
it on pop. This works across resources for the runtime frame's renderers, and inside one page for bespoke
screens.

### 1.4 Getting gamepad input into NUI

**Pattern.** The page doesn't read the gamepad. The game does, and the runtime forwards **semantic**
navigation events (`up/down/left/right/accept/back/tabPrev/tabNext/pagePrev/pageNext`) to whichever
surface owns focus.

**Why.**
- NUI captures keyboard and mouse when focused, so the game stops seeing those keys. A key held at open
  even stays "pressed" in the game afterwards [V cfx IsControlPressed thread].
- Whether the CEF Gamepad API (`navigator.getGamepads`) sees a controller inside FiveM is **unknown**
  [I; spike].
- Even if it did, two readers of one pad (game and page) would double-fire.

**Specs.**
- While a surface is focused, the controls service disables the game's frontend/pad controls. Lua reads
  the disabled pad controls each frame (`IsDisabledControlJustPressed` on the frontend controls) and sends
  **one message per press** (event-driven, not per frame) [R natives, I design].
- Repeat timing (§1.1) runs in Lua so it matches the game's frame clock [I].
- Map the pad as follows [V XAG 112 lists these as consistent prompts; Forza uses LB/RB for tabs
  everywhere, V XAG 114]:
  - LB/RB = tabs;
  - LT/RT = pages;
  - A = accept, B = back;
  - X / Y = the surface's secondary / tertiary actions.

**nuikit.**
- **Service** (the planned `controls` service, `architecture.md` §1) gains a `nav` channel.
- `nuikit-core` turns `nuikit:nav` messages into the same handlers as keyboard events, so pages handle one
  event stream.
- **Spike required:** does the pad reach the game while `SetNuiFocus(true, true)` is on, and what is the
  press → paint latency? (§10.)

### 1.5 Input prompts that switch glyphs with the active device

**Pattern.** Every key hint (`[E] Open trunk`, the action bar at the bottom of a menu) shows the glyph for
the device the player **last used**, and the binding the player actually has, not the default.

**Why it works.**
- Steam's guidance: show device-specific glyphs, re-query the bound origin rather than caching it (so
  remaps show up), cycle through glyphs when several inputs are bound, and plan fallbacks for unknown
  origins [V Steamworks].
- XAG: update hints and tutorials to reflect remapped bindings [V XAG 107].
- Keep labels next to their element and keep the same icon and label for the same function everywhere
  [V XAG 114].

**Specs.**
- **Device switch.** Switch on the first *meaningful* input from the other device: a button press, or a
  stick past a 0.5 deadzone. Ignore mouse jitter under about 4 px [I]. Debounce 250 ms so mixed use
  doesn't flicker [I].
- **Glyph source.**
  - For `RegisterKeyMapping` commands, FiveM resolves the bound key with `GetControlInstructionalButton`
    on the command's hash (`GetHashKey(cmd) | 0x80000000`). It returns `t_X` for text keys and `b_NNN`
    for special keys, which need a lookup table [V cfx how-to thread].
  - For game controls, the same native takes a control id [R].
  - The keyboard-vs-pad signal is the "is using keyboard" pad native (`IsUsingKeyboard` /
    `_IS_USING_KEYBOARD_AND_MOUSE`) [R; name and reliability need a spike].
- **Pad families.** Xbox and PlayStation layouts. Offer a glyph-style pref (`auto|xbox|playstation|
  keyboard`), because detection may not tell DualSense from Xbox [V Steamworks makes the same point about
  emulated pads].
- **Glyph art.** Original, drawn as an `nk-key` chip: a rounded square for keys, a circle for face
  buttons, a pill for bumpers/triggers. Labels are text, never PlayStation/Xbox trademarks or
  shape-symbol art [I]. Recommendation: letter labels (A/B/X/Y, or "Cross/Circle" spelled out for
  PlayStation) inside neutral shapes.

**nuikit.**
- **Service** `input`: Lua tracks the last device and the binding table. On change only, it sends
  `nuikit:input { device: 'kbm'|'pad', style, bindings: { [command]: glyph } }`. The page sets
  `data-nk-input` on `<html>`.
- **Component**: `key-hint` / `key-prompt` take an **action name**, not a key (`<KeyHint action="interact"
  />`), and resolve the glyph.
- **Token**: `--nk-key-*` (`v2.md` component set).
- **Intent**: `prompt` gains `action` (a command name) next to its literal `key`.

---

## 2. HUD information hierarchy

### 2.1 Contextual HUD: show on need

**Pattern.** The HUD has three levels:
- **hidden**: the world only;
- **peek**: a part reveals itself because it changed or crossed a threshold, then fades back;
- **full**: on a key hold, a menu or a context such as entering a vehicle.

Parts own their reveal rules. A global controller decides what may show.

**Why it works.**
- The genre's most praised HUDs strip information back and let the world carry it: Ghost of Tsushima's
  near-empty HUD, Elden Ring [V bearblog]. NoPixel V's update is described as "cleaner" HUD and menus
  [V `research.md`].
- Auto-fading can feel like the game taking control away when it isn't predictable. Far Cry 2's fading
  HUD drew that criticism, while TF2's pop-ups respond to *player actions* [V gamedeveloper "what players
  want"]. **Reveal rules must be legible: change, threshold or player request, never random timing** [I].
- Immortals Fenyx Rising's settings preview three HUD presets: default, light, disabled [V XAG 114].

**Specs.** [I unless noted]

| Rule | Value |
|---|---|
| Reveal on change | fade in 120 ms, hold 3 s after the last change, fade out 400 ms |
| Threshold | stay shown while below it (health < 50%, fuel < 15%, hunger/thirst < 25%), pulsing at most once on crossing |
| Hold-to-peek | one key (pad: d-pad down hold) shows all parts while held |
| Context | vehicle cluster only in a vehicle; ammo only while armed or aiming; voice only while talking |
| Global hide | pause menu, cinematic camera, phone camera, `nuikit_loading`, a full-screen surface (surfaces `hides`, protocol §3.3) |
| Presets | `full`, `minimal` (show on need), `off`; a pref |

**nuikit.**
- **Service** `hud` (in the runtime; parts can live in any resource):
  - `nk.hud.reveal(part, ms?)`, `nk.hud.hold(part, reason)` / `release`;
  - global states `hidden|minimal|full`;
  - the reasons stack (like surfaces), so two scripts can't fight over visibility.
- **Pref**: `hudMode`.
- **Token**: `--nk-hud-reveal-hold` (3 s), plus the existing `--nk-duration` and `--nk-ease`.
- Cost is zero while idle. Reveals are messages on change, and CSS transitions do the fading. No timers in
  Lua.

### 2.2 Diegetic, spatial, meta and non-diegetic

**Pattern.** Use the four-type taxonomy (definitions in `research.md` §1.7) to decide *where* information
lives. Use it deliberately:

| Type | Use in RP | nuikit layer |
|---|---|---|
| Non-diegetic | vitals, money, notifications, menus | HUD + intents (most of the kit) |
| Spatial | target eye, world labels, waypoint pins, interaction prompts | `target`, `prompt`, world markers (§2.3) |
| Meta | low-health vignette, hurt flash, "incapacitated" band, drunk blur | full-screen effect layer, game-side where possible |
| Diegetic | phone, laptop, tablet, vehicle dash | device frame (§8) |

**Why.**
- Diegetic UI that hurts function gets non-diegetic help back. Dead Space added a ground "locator" because
  its 3D map didn't help navigation. "The rule of functionality preservation" comes first [V
  gamedeveloper].
- Fully diegetic HUDs are rarely practical [V same].

**Specs.**
- **Meta effects** are opacity-only overlays: a radial-gradient vignette at `--vital-health`, with alpha
  ≤ 0.35 at 0 HP. Never CSS blur, which is CPU-bound in CEF [V `research.md` §1.4]. Use game-side
  timecycle or screen effects for blur [R].
- Meta effects honour `reducedMotion` and a pref to turn them off (XAG 117 asks for options to reduce
  visual distractions [V]).

**nuikit.**
- **Component** `vignette` (meta layer).
- **Token** `--nk-meta-intensity` (0–1).
- **Pref** `metaEffects`.

### 2.3 World-anchored markers and labels

**Pattern.** Pins and labels attached to world points: waypoint, job objective, a player's name tag, door
or shop labels, a dropped item.

**Rules:**
- They scale and fade with distance.
- When off-screen they clamp to the screen edge with a direction arrow.
- They hide when occluded or out of range.

**Why.** Spatial UI keeps the player's eyes on the world. Showing a prompt only near its target, fading by
distance and occlusion, and never more than one prompt per key in view are already rules
(`research.md` §4).

**Two rendering routes in FiveM:**
1. **NUI projection.** Lua projects world → screen (`GetScreenCoordFromWorldCoord`) and the page moves an
   element there [V cfx coords thread].
   - The cost is the problem. A pin that tracks the camera must update **every frame**, about 0.3 ms per
     frame for the message alone [V repo protocol §5.7].
   - At 30 Hz streaming it lags the camera visibly at speed [I].
2. **Native.** Draw in the game's own render: `DrawMarker`, `DrawSprite` with `SetDrawOrigin`, or a DUI
   texture.
   - DUI renders an NUI page to a runtime texture that `DRAW_SPRITE` can draw, or that can be drawn in 3D
     through a Scaleform [V FiveM DUI docs].
   - This locks to the camera for free, but each draw call runs per frame in Lua.

**Specs.** [I]
- **Budget.** ≤ 8 visible pins at once, nearest first. Labels only within 10 m (doors, shops) or 25 m
  (players, when the server allows name tags).
- **Size.** Scale between 1.0× at ≤ 5 m and 0.6× at the cut-off. Fade out over the last 20% of range.
- **Occlusion.** Raycast at most 4 Hz per pin, never per frame.
- **Off-screen.** Clamp to a 48 px inset ellipse with an arrow. Only the waypoint and the objective clamp;
  the rest just hide.
- **Content.** Text and icon only (an `nk-chip`). No panels over the world.

**nuikit.**
- **Intent** `marker` (world point or entity, label, icon, range, clamp, priority).
- **Service** in the runtime that culls, sorts and budgets across resources, so ten scripts can't put up
  forty pins.
- **Renderer:** a spike decides between DUI sprites (per-frame Lua draw, no per-frame NUI message) and
  NUI projection (§10).
- **Component** `world-label` for the NUI route. Moving it with `transform: translate3d` on an
  absolutely-positioned, non-centred element is allowed. The repo rule bans transforms on centred dialogs.

### 2.4 Minimap conventions

**Pattern.** GTA players already know these conventions [R]:
- the radar bottom-left;
- heading-up rotation on foot and in vehicles;
- blips that shrink with "short range";
- the waypoint as a purple route;
- an expanded view on a key.

The v2 plan frames GTA's radar (route (a)), with the compass on the ring, the waypoint tag and two-line
location (`v2.md` §3–4).

**What to add as systems.** [I]
- **Blip hygiene.** A shared helper that sets category, short-range and display flags, so script blips
  group in the pause map legend and don't flood the radar [R natives: `SetBlipCategory`,
  `SetBlipAsShortRange`, `SetBlipDisplay`]. This is presentation-only and stays in Lua.
- **Zoom on speed.** Radar zoom follows vehicle speed in steps with hysteresis (GTA does this itself in
  vehicles [R]). Expose it as config, not new UI.
- **Edge tag for the waypoint.** Distance in the server's unit, updated on change of 10 m (`NUI.stream`
  precision), never per frame.
- **Expanded map on hold.** Map the "show full HUD" peek (§2.1) to also expand the radar (`SetBigmapActive`
  [R]), so peek gives one coherent answer to "where am I, how am I".

**nuikit.**
- **Component** `minimap-frame` + `compass-ring` (v2 step 2).
- **Lua helper** `nk.blip`.
- **Tokens**: `--nk-map-ring`, `--nk-map-tick`.
- The rect comes from the minimap anchor math, already planned.

---

## 3. Notification systems

### 3.1 One service, four lanes

**Pattern.** Every message from every script goes through one notification service. The service picks the
**lane**, which sets the size, position, duration and sound:

| Lane | What | Look | Duration | Max visible |
|---|---|---|---|---|
| **feed** (ambient) | passive info: "Saved outfit", "+$20 tip" | small toast in the stack | 4–6 s | 3–4 |
| **toast** (standard) | status the player should see: paid, job done, warnings | toast with icon + title + line | 5–7 s, sticky when it has an action | (same stack) |
| **banner** (urgent) | needs attention now: incoming call, dispatch, server restart in 5 min | full-width or top-centre band, above the stack | until handled or 8–12 s | 1, others queue |
| **moment** (full-screen) | rare, emotional, state-changing: "Wasted", "Job complete: $2,400", level up | centred over a scrim, big display type | 2.5–4 s, skippable | 1, blocks other moments |

Durations are [I], lengthened from the 2–4 s web norm because attention is on the world (`research.md` §3).

**Why it works.**
- The UEFN guidance on in-game messages: match the device to the message type, place by urgency (centre
  grabs attention but blocks play; corners for status), scale sound with importance, and add cooldowns
  [V UEFN].
- GTA's own split [R]: the feed above the minimap, help text top-left, big centred "shards" for moments.
  Players read these lanes already.

**Specs.**
- **Priority.** `moment > banner > toast > feed`.
  - A higher lane pre-empts a lower lane's *slot* but never deletes its messages. They wait.
  - While a moment shows, the feed and toasts pause their timers [I].
- **Queueing.**
  - The stack shows the newest at the anchor edge.
  - Overflow queues. When there are more than 4 queued, the oldest *feed* items collapse into
    "+N more", viewable in history [I].
- **Deduplication.**
  - Same `key` (or same title + description) within the visible window: increment a "×N" badge and reset
    the timer; don't add a row [V UEFN: group events into one message; `research.md` §4].
  - Numeric merges for money and items: "+$20" then "+$30" within 1.5 s becomes "+$50" [V UEFN uses a
    1.5–3 s batching window].
- **Rate limit.** A per-resource cap, for example 5 toasts per 10 s. Above it, messages fold into one
  "<resource>: N updates" and the doctor logs the spam [I].
- **History.** The last 50 notifications, readable in the pause menu or the phone. Missed notifications are
  reviewable, as NPWD does from the phone header [V NPWD].
- **Never steal focus** (`research.md` §4). Banners with actions use a key prompt ("Y Answer / N Decline")
  resolved through the input service, not mouse focus.
- **Accessibility.**
  - Icon + word for status, never colour alone.
  - Durations scale with a "notification time" pref (×1–×3); XAG 116 covers extending time limits [V
    title].
  - Every sound cue has a visual (XAG 103: no cue relies on a single sense [V]).

**nuikit.**
- **Intent** `notify` gains `lane`, `key` (dedupe), `merge` (`sum` for numeric deltas), `sticky`,
  `actions` (with action names for glyphs) and `sound`. Adapters map ox/qb/esx calls to `toast` by
  default, and `type='error'` to toast + error sound.
- **Service**: queue, dedupe, rate limit and history live in the runtime, so a stand-in for okokNotify
  and a qb event land in the same stack.
- **Components**: `nui-toaster` (exists), plus `banner` and `moment`.
- **Tokens**: `--nk-toast-*`, `--nk-moment-scrim`.
- **Pref**: `notifyDuration`, plus a "do not disturb" that keeps only banners.

### 3.2 Toast anatomy (to keep every script native)

Icon tile (status colour on the icon only) · title (one line) · description (≤ 2 lines, ≤ 60 characters a
line) · optional key-hint action · thin timer line (only when sticky = false and the pref `showTimers` is
on) [I, consistent with `v2.md` §4 "uniform slabs"].

---

## 4. Menu architecture

### 4.1 Tabs, pages, nesting and breadcrumbs

**Pattern.** A menu shell with:
- a **header**: title, plus a breadcrumb when nested;
- **tabs** for sibling sections (bumpers or Q/E);
- a **body** (list, grid or form);
- a **detail pane** for the focused item (optional);
- an **action bar** across the bottom showing the current device's keys for every available action
  (accept, back, plus 1–2 contextual ones).

**Why it works.**
- XAG: players must always be able to tell where they are in the hierarchy. Every submenu keeps a
  persistent way back to the main screen. Context help per button helps [V XAG 112, 114].
- CommonUI's action bar shows the button for each interaction, and input routing lets the tab bar keep
  the bumpers while the body takes accept [V CommonUI overview].

**Specs.** [I unless noted]
- **Breadcrumb.** At most 3 levels shown ("Garage › Sultan RS › Mods"). Deeper levels collapse to
  "… ›". Keep nesting to 3 levels. An audio designer's example cites "3 layers" of settings menus as
  already excessive [V Audiokinetic].
- **Tabs.** 2–7. LB/RB or Q/E wrap. The active tab is marked by weight + an indicator (`--nk-row`
  indicator token), not colour alone.
- **Back.** Back pops one level and restores focus (§1.3). Back on the root closes the surface
  (surfaces' Escape).
- **Action bar.** Order is fixed (accept, secondary, tertiary, back) and the same on every surface [V XAG
  112: consistent prompts].
- **Search.** Over 10 items (existing rule). XAG also asks for more than one way to find items in complex
  content: filters and search [V XAG 112].

**nuikit.**
- **Components**: `menu-shell` (header, tabs, body, detail, action bar), `breadcrumb`, `action-bar` (reads
  the input service).
- **Intent** `menu` gains `tabs` and `detail` fields, so ox/qb menus with submenus render breadcrumbs
  automatically.

### 4.2 Radial vs list

**Pattern.**
- **Radial** for a small, stable set of frequent actions (emotes, vehicle controls, quick items).
- **List** for anything long, dynamic or text-heavy.

**Why it works.**
- Pie menus cut seek time and errors versus linear menus [V Callahan et al., CHI 1988].
- Eight items is about the practical maximum. Marking (flick in a direction without looking) was about
  3.5× faster than visual selection for experts [V Buxton/Kurtenbach as summarised in the radial-menus
  article].
- Marking only works when item **positions are stable**. Menus whose items shift never build muscle memory
  [V same].

**Specs.**
- **Radial.** 4–8 items [V]. A dead zone of 25–35% of the radius [I]. Stick or mouse direction selects;
  release or click confirms (hold-to-open, release-to-pick, as GTA's weapon wheel [R]).
- **Stable positions.** Keep positions stable: a missing option leaves an empty, disabled slice rather than
  reshuffling [I, from V marking-menu stability].
- **Submenus.** Replace the ring, with the centre showing the parent and back.
- **List.** For more than 8 items or dynamic contents.

**nuikit.**
- **Component** `radial-menu` exists. Add stable slot positions and a dead zone. Pad stick input comes
  through the controls service as an angle stream (`NUI.stream`, `kind='angle'`, ≤30 Hz), never per frame.
- **Intent** `radial` gains `slot`.

### 4.3 Nested context menus

**Pattern.** Context menus open beside their origin, aligned to the first row (existing design rule). On a
pad, they open as a sheet anchored to the focused item, and Back closes them.

**nuikit.** No new system. The focus scope with `trap` + `restore` (§1.1, §1.3) makes them pad-correct.

### 4.4 Settings menus done well

**Pattern.** Settings as a generated screen from a **schema**:
- every setting has a label, a one-line description, a control, a default and a live preview;
- categories as tabs;
- presets at the top.

**Why it works.**
- XAG: settings previews show each option's effect; help is context-sensitive; accessibility settings are
  reachable early [V XAG 112, 114].
- The Last of Us Part II bundles recommended settings into vision, hearing and motor **presets** that can
  stack and still be tweaked individually [V Naughty Dog].
- A revert timer protects against settings that make the screen unusable. One shipped example drops the
  menu to preview, then gives 10 s to keep or revert [V Blue Shutter devlog].

**Specs.** [I unless noted]
- **Apply.** Changes apply live. Settings that can break readability (scale, contrast, HUD off) use a
  10–15 s keep/revert prompt [V 10 s example].
- **Rows.** Every row has "reset to default". Changed rows show a dot. "Reset all" sits behind
  hold-to-confirm.
- **Detail pane.** The focused setting's description and a live preview: the HUD preview on the right,
  the toast preview fires a sample toast.
- **Controls.** Sliders step by d-pad left/right with key repeat. Toggles flip on accept. Select lists cycle
  left/right on pad (no dropdowns needing a pointer).
- **Persistence.** Prefs persist in KVP (exists).

**nuikit.**
- **Service**: prefs (exists) grows a **schema registry**: `nk.prefs.register({ id, label, description,
  type, default, preview })`. Resources contribute their own settings; the pause menu's settings tab is
  generated from it.
- **Component**: `settings-row` (label + description + control + reset), `settings-page`.
- **Presets**: `readability`, `low-motion`, `minimal-hud`, defined as pref bundles.

### 4.5 Inventory and grid systems

**Pattern.**
- A **uniform-cell grid** (not shape-fitting "Tetris"), with weight or slot capacity as a meter.
- A two-pane layout (self ↔ other), a fixed hotbar, and a list view toggle for long inventories.

**Why it works.**
- Grids are scannable by picture and suit "backpack" games.
- Lists remove packing busywork and scan better when text matters. Weight-capped systems keep every item
  visible. Both can do the same tasks [V gamedev.net grid-vs-list thread].
- RP inventories (ox_inventory and most Tebex ones) are uniform grids with weight [R], so a uniform grid
  matches what scripts already send.

**Specs.** [I unless noted]
- **Cells.** 4.5–5.5 rem square (72–88 px at 1080p), a 0.375–0.5 rem gap, 5–6 columns per pane.
- **Overlays.** Count bottom-right in the numeric font. Durability as a 2 px meter along the bottom edge.
  Rarity as a 2 px top edge + a label in the tooltip (never colour alone).
- **Pad moves.**
  - Accept on an item picks it up (it rides the focus). Accept on a target drops it; Back cancels.
  - X = quick-use; Y = split, with a number stepper (default half).
  - This is the click/key alternative to drag [V XAG 107: provide alternatives to drag; GAG: avoid
    required click-and-drag].
- **Tooltip.** On **focus**, not only hover. Place it beside the cell on the side with more room; never
  over the other pane's first column.
- **Find.** Search + category filter chips, plus sort (name, weight, recent) [V XAG 112].
- **Drag performance.** Move a ghost with `transform` only, and send page → Lua at most once on drop, never
  while dragging.

**nuikit.**
- **Components**: `item-slot` (exists), plus `item-grid` (nav scope `grid`, pick-up mode), `item-tooltip`
  and `weight-meter` (meter exists).
- Used by the `ox_inventory` override. No intent: an inventory is a bespoke screen through the protocol.

### 4.6 Comparison views

**Pattern.** When a player considers replacing something (a weapon attachment, a vehicle in a dealership,
clothing with stats, a job upgrade), show **current vs candidate** side by side. Each stat row shows the
candidate value and a signed delta.

**Why it works.** The genre's loot games trained players to read "equipped vs this" comparisons with
up/down deltas [R]. Without them, players do arithmetic in their heads.

**Specs.** [I]
- **Stat row.** Label · current · candidate · delta.
- **Delta.** Arrow glyph + sign + number ("▲ +12"), coloured with `--success` / `--destructive`, plus the
  arrow, so it is never colour alone.
- **Equal values.** Show "—" and dim the row.
- **Bars.** Bars show the candidate as a fill with the current value as a tick mark on the same track,
  which is easier to read at a glance than two bars [I].
- **Placement.** Pinned beside the focused item (tooltip side), or as the detail pane in a menu shell.
- **Pad.** Cycle what you compare against with a bumper.

**nuikit.** **Component** `stat-compare` (a row + bar variant). Used by vehicle shops (`qbx_vehiclesales`
override), clothing and inventory tooltips.

---

## 5. Feedback loops

### 5.1 Hold-to-confirm

**Pattern.** Destructive or costly actions (sell vehicle, drop all, delete character, pay a large fine)
need a sustained press. A fill shows progress; release cancels.

**Why it works.**
- It turns a confirmation dialog, which people click through on autopilot, into a deliberate act [V dev.to;
  anecdotal: "zero accidental deletions"].
- GTA trains players on filling hold rings already [R].

**Specs.**
- **Duration.**
  - 0.8–1.0 s for reversible but costly actions.
  - 1.5 s for irreversible ones.
  - The web article's 3–5 s is too long for a game. XAG names holds of 2–3+ s as a barrier [V XAG 107]
    [I synthesis].
- **Fill.** Linear progress. The fill drains in about 100 ms on release [V dev.to 100 ms retraction].
- **Hint on tap.** A tap without a hold nudges the bar to teach "hold" [V dev.to].
- **Done.** A completion tick + sound.
- **Accessibility.** A pref `holdToConfirm: 'hold' | 'press-twice'` replaces holds everywhere with a
  two-press confirm within 2 s. XAG and GAG both say to minimise holding and offer toggles [V XAG 107,
  GAG].
- **Cost.** The fill is one CSS transition on `transform: scaleX` (a non-centred element) or an SVG
  `stroke-dashoffset`. No JS per frame.

**nuikit.**
- **Component** `hold-button` (+ the ring variant on `progress-ring`).
- **Token** `--nk-hold-duration`.
- **Pref** as above.
- **Intent** `confirm` gains `hold: true`.

### 5.2 Skill checks (challenge)

**Pattern.** Timed input mini-games: a moving needle into a zone, key sequences.

**Why it needs care.**
- XAG and GAG: avoid QTEs and button mashing. Where they're unavoidable, offer a less demanding
  alternative or let the player skip [V XAG 107, GAG].

**Specs.** [I]
- **Zone.** Zone width scales with a `challengeAssist` pref (×1, ×1.5, ×2). Needle speed scales inversely.
- **Timeout.** The input window never needs presses closer than 0.5 s for the assisted level (GAG
  advanced lists a 0.5 s cooldown between inputs [V]).
- **Feedback.** Hit / miss feedback uses shape + sound + colour.
- **Prompt.** The required key is shown with the input service's glyph.
- **Presentation only.** The calling script decides the outcome rules. nuikit renders, and reports
  hit/miss and timing.

**nuikit.** `skill-check` (exists) reads the pref. The `challenge` intent gains `assist` (the server may cap
it) [I].

### 5.3 Progress

**Pattern.** A label, a thin line and the cancel key ("X Cancel"), bottom-centre (`v2.md` §4), and the
same anatomy for every script.

**Specs.**
- Determinate when the duration is known, which is nearly always in RP (`duration` ms).
- The line animates with one CSS transition of the given duration (no per-frame JS).
- Cancel through the input service.
- At ≥ 30 s, show the remaining time in the numeric font [I].

**nuikit.** `task-progress` (exists) + the `progress` intent (exists). Add the action-name cancel.

### 5.4 Rewards and loot reveals

**Pattern.** A short, skippable reveal for meaningful gains: a job payout summary, a rare find, a level
up. Anticipation (a brief build) → reveal (item + tier) → settle (it flies to the inventory or the feed).

**Why it works.**
- Colour-coded tiers are a shared language, ascending roughly green → blue → purple → gold/yellow, from
  Diablo's lineage [V Game Informer].
- Keep the **mechanism** (an ordered tier scale and a short reveal), not any game's palette or art.

**Specs.** [I]
- **Tiers.** 5 tiers as **tokens** (`--nk-tier-1` … `--nk-tier-5`). The default Graphite ramp derives from
  the theme (neutral → `--chart-*`), so each server's tiers look like that server. Every tier also has a
  **name and a shape mark** (1–5 pips), never colour alone.
- **Timing.**
  - Total ≤ 900 ms for common rewards: 150 ms build, 300 ms reveal, the rest settle. Up to 2 s for a rare
    tier.
  - Always skippable with accept or back. Never blocks movement.
  - Only `moment`-lane rewards are centred. Everything else is a feed item.
- **Reduced motion.** Under `reducedMotion`: no build, a direct fade.
- **Photosensitivity.** No flashes; keep any brightness pulse to one, at low amplitude (XAG 118 covers
  photosensitivity [V title]).

**nuikit.**
- **Component** `reward-card`.
- **Notify lane** `moment` with `tier`.
- **Tokens** for tiers.

### 5.5 Item add / remove

**Pattern.** The `v2.md` §4 slab (icon tile + name + delta), batched.

**Specs.**
- **Batching.** Merge per item within 1.5 s ("Water ×3" rather than three toasts) [V UEFN batch window].
- **Stack.** Max 4 visible, newest at the anchor. Removals use a minus delta and a muted tile.
- **Position.** Near the hotbar or the bottom-centre, a separate small stack from toasts (it's feedback,
  not news) [I, consistent with GTA's split of feed vs inline feedback, R].

**nuikit.** **Intent** `notify` with `lane: 'item'` (a fifth, sub-lane of feed) and `merge: 'sum'`. The
ox_inventory and qb inventory adapters emit it.

---

## 6. Audio as part of UI

### 6.1 The pattern

**Pattern.** A small, consistent **UI sound palette**:
- nav tick (focus moved);
- select/accept;
- back/cancel;
- error/denied;
- toggle on / off;
- slider step;
- notify by lane (feed: none or very soft; toast: soft; banner: distinct; moment: a short sting);
- hold complete;
- reward by tier.

**Why it reads premium.**
- Firaxis' 2026 GDC session frames UI sound as "an opportunity to bring your game to the next level". The
  stated goals are clear, on-brand, durable under repetition, built as a system with hierarchy [V GDC
  Civilization VII abstract].
- Audiokinetic's guidance [V]:
  - build a palette per menu family, and let shared functions share sounds;
  - match sound complexity to the action (simple actions, simple sounds);
  - filter what needs a sound at all;
  - make important alerts distinct without masking gameplay cues. Transients and 1–5 kHz content cut
    through.
- Sound alone must never carry information. Pair every cue with a visual [V XAG 103, GAG]. Separate volume
  controls are a GAG basic [V].

**Specs.** [I unless noted]

| Sound | Length | Level (relative to the UI bus) | Rule |
|---|---|---|---|
| nav tick | 20–50 ms | −12 dB | throttle: at most 1 per 50 ms; key repeat plays every 2nd step |
| select | 60–150 ms | −6 dB | on release (matches XAG up-event activation) |
| back | 60–120 ms | −8 dB | a falling counterpart to select |
| error | 120–250 ms | −6 dB | lower pitch, two notes; never on every invalid keystroke, once per attempt |
| toast / banner | 150–400 ms | −8 / −3 dB | feed silent by default |
| moment | ≤ 1.2 s | 0 dB | ducks nothing; never loops |

- **Variation.** Small random pitch variation (±2–3%) on nav ticks keeps repetition from fatiguing. Keep it
  off on select and error, so those read as "the same thing" [I; Audiokinetic warns against variation that
  confuses].
- **Volume.** A UI volume pref (0–100%, default 60%), separate from the game's SFX volume.
- **Identity.** The palette is part of the **identity** (Graphite's soft clicks, Signal's harder
  transients…): a theme-level `sounds` map, original recordings or synthesis only. Never GTA's frontend
  sounds bundled as files, and never another server's sounds.

### 6.2 Can NUI play audio cheaply?

**Two backends:**
1. **Game frontend sounds** (`PlaySoundFrontend(-1, name, set, true)`) [R native].
   - Free in NUI terms and mixed by the game (respects its volume and pause).
   - Limited to GTA's sound sets, so the server sounds like GTA, not like itself.
   - Some sets need an audio bank first (`RequestAmbientAudioBank`) [V cfx PlaySoundFrontend thread].
   - Each call is a Lua call. From a page that is a callback (about 0.5 ms [V repo]), so it is wrong for
     nav ticks.
2. **NUI Web Audio** in the page.
   - Decode each sound once into an `AudioBuffer` and play it with a fresh `AudioBufferSourceNode` per hit.
     That is the low-latency path for short sounds; `<audio>` elements are a poor fit for game-style
     triggering [V web.dev].
   - A community NUI spatial-audio resource measured about 0.02–0.03 ms while playing and 0.00 ms after
     [V cfx 3D audio].
   - Reported problems with URL-loaded sounds: a start delay, and sound lagging in fast vehicles [V
     xSound thread]. That points to **local, preloaded** files only.

**Recommendation.** [I]
- Web Audio in the **runtime's frame** (one `AudioContext` per server, not per resource), with buffers
  preloaded from the theme's `sounds` map at boot (≤ 300 KB total, OGG/Opus, mono, 48 kHz).
- Other pages trigger sounds through `nk.sound.play('select')`, as a message to the runtime frame or a
  local call when hosted. Game frontend sounds are a fallback set for servers that want "GTA-native" feel.
- Nav ticks play **in the page that owns focus** when it isn't the runtime frame, so there's no cross-frame
  hop. Each page gets a lazily created context with the same buffers, created only on first sound.

**nuikit.**
- **Service** `sound` (runtime): palette, volume pref, throttle rules, lane mapping for `notify`.
- **Token or theme field**: `sounds`.
- **Components** emit semantic sounds (`row` → nav, `button` → select), muted by a `data-nk-sound="off"`.
- **Spikes:**
  - CEF autoplay policy: does an `AudioContext` start without a user gesture in NUI?
  - press → sound latency;
  - CPU while idle with a suspended context;
  - does game pause or minimise mute NUI audio? (§10)

---

## 7. Day/night and context adaptation

**Pattern.** HUD and world-overlay legibility adapts to the scene: stronger backplates or shadows over
bright scenes (midday, snow, interiors with white walls), dimmer whites at night to avoid glare.

**Why it works.**
- Text over non-solid backgrounds must pass contrast against the lowest-contrast part, and backplates or
  outlines are the remedy [V XAG 102 via `research.md`].
- Real failures: Ghost of Tsushima's guiding-wind cue loses contrast in snowy areas, exactly where players
  need it [V Can I Play That]. Elite Dangerous players asked for a text halo against bright backgrounds,
  the avionics technique [V Frontier forum]. A HUD dev found a soft dimmed backdrop keeps symbology
  visible against bright horizons where a plain drop shadow looked crude [V Leadwerks].

**What NUI can and can't do.**
- **Can't sample the game picture.** The page is a transparent overlay with no access to the frame [I].
  No pixel-luminance adaptation.
- **Can know the scene** from Lua at low frequency [R natives]:
  - clock hour (`GetClockHours`);
  - weather (`GetPrevWeatherTypeHashName` / `GetNextWeatherTypeHashName` + the transition);
  - interior (`GetInteriorFromEntity`);
  - underwater, in an aircraft, camera mode.

**Specs.** [I]
- **Scene classes.**
  - `day` (07–18h), `dusk` (05–07h, 18–20h), `night`;
  - modifiers `snow`, `fog`, `interior`.
- **When to send.** Lua sends `nuikit:scene` only on a class change, checked every 10 s. Weather lerps
  slowly anyway.
- **Token responses.**

  | Scene | Change |
  |---|---|
  | `day` | `--nk-hud-opacity` + 0.15; text shadow `strong` |
  | `snow` | as `day` + 0.1; HUD text shadow becomes a 1 px outline (`-webkit-text-stroke` is costly on many nodes; use a 4-direction `text-shadow` [I]) |
  | `night` | HUD white drops to about 90% luminance; glow tokens × 0.6 |
  | `interior` | as `day` |

- **Contrast floor.** Players can pin the strongest backplate ("always backplate"), which overrides scene
  logic. XAG asks for adjustable backplate opacity [V].
- **Cost.** One attribute change on `<html>` (`data-nk-scene`) re-resolves tokens in CSS. Changes are
  rare, so there are no idle costs. Fade token changes over 2 s so the HUD doesn't jump at 07:00.

**nuikit.**
- **Context** (like theme and player): `scene`, delivered with the capability `scene`.
- **Tokens**: per-scene overrides in the compiled theme (`[data-nk-scene=day] { … }`), generated by the
  compiler from identity values, so themes don't hand-write them.
- **Pref** `hudBackplate: auto|always|never`.
- `nuikit check` gains "HUD text passes 4.5:1 vs `#fff` with the `day` tokens".

---

## 8. Phone and device UIs in RP servers

**Conventions observed.**
- **Notifications in two states.** A closed phone shows a partial "peek" of the screen for calls, texts and
  social posts. An open phone shows notifications across the top. Missed notifications are reviewable from
  the header [V NPWD].
- **Customisation.**
  - Dark theme by default, with a light theme [V NPWD].
  - Selectable frames/cases and icon sets [V NPWD].
  - Zoom 100%–70% [V NPWD].
  - Streamer mode that hides images until clicked [V NPWD].
- **App catalogue.**
  - Contacts, calls, messages, camera and photos, notes, settings [V LB, NPWD].
  - A social feed, banking and a marketplace are near-universal [V fivemx comparison].
  - Garage, maps, weather and an app store are common [V LB].
- **Extensibility.**
  - Custom apps through exports/config [V LB].
  - NPWD has external-app hooks and types packages, with apps talking over window events [V NPWD
    GitHub].
  - LB custom apps can't use the phone's own UI [V LB], which is the gap a shared kit fills.
- **Cost bar.**
  - LB: 0.00–0.01 ms idle and 0.07–0.09 ms active, on a 170-player server [V LB, vendor claim].
  - NPWD: about 0.01 ms idle and 0.05 ms in use [V NPWD, vendor claim].
- **Form factors.** A compact handset vs a larger tablet layout per activity [V NoPixel V via
  `research.md`]. The phone slides up bottom-right, like GTA's [R].
- **Camera and selfie.** Camera mode hides the HUD and the phone frame [V LB features; I for HUD hiding].

**Why devices work.** Long, dense tasks (banking, dispatch, messages) fit a diegetic frame. Quick tasks fit
panels (`research.md` principle 13).

**Specs for nuikit's part.** [I] nuikit doesn't build a phone (gameplay data, calls and voice belong to the
phone resource). It provides the **device layer** every phone and laptop resource would otherwise rebuild:
- **Device frame.**
  - Handset at 20–24 rem × 42–48 rem (≈ 360 × 760 px at 1080p), anchored bottom-right inside the safe zone.
  - Tablet at 56–64 rem wide, centred.
  - The zoom pref is 70–100% (convention).
- **States.** closed → peek (top 6–8 rem shows, no focus) → open (focus) → camera (frame hidden, HUD
  hidden).
- **App shell.** Status bar (time from the game clock, signal and battery as decoration), app header with
  back, bottom home affordance. Back = surfaces' Escape (one level at a time).
- **Notification bridge.** The notification service (§3) routes `channel: 'device'` items to the peek when
  the phone is closed, and to the top banner when it's open. Ordinary toasts never duplicate them.
- **Apps as modules.** Third-party apps are host modules (`mount(el, props, context)`,
  `architecture.md` §4). They get the theme, input glyphs and focus scopes for free.
- **Streamer mode** as a pref every image component honours (`data-nk-streamer`).

**nuikit.**
- **Components**: `device-frame`, `app-shell`, `app-grid`, `peek`.
- **Service**: a surface type `device` (focus off in peek, on when open).
- **Protocol**: an app-module contract on top of the host's module loader.

Never copy any phone's icon set, home screen layout or app designs. The *conventions* above are shared;
the expressions are not (`research.md` §5).

---

## 9. Ranked roadmap: the 15 systems to adopt

Ranked by impact on "premium and coherent by default" relative to effort. Effort is S (≤ 3 days), M (1–2
weeks) or L (3+ weeks), for one agent including browser checks [I].

| # | System | Kind | Effort | Impact | Why this rank |
|---|---|---|---|---|---|
| 1 | **Input service + glyph-switching key hints** (§1.5) | service + component + intent field | M | Very high | Every prompt, action bar and menu shows the right key for the player's device and bindings; gamepad players stop seeing keyboard keys. Touches every UI at once. |
| 2 | **Focus scopes, spatial nav and focus memory** (§1.1–1.3) | core module + service | M–L | Very high | Makes every kit component d-pad and keyboard complete; fixes "lost focus" across stacks. Prerequisite for 6, 10, 12. |
| 3 | **Gamepad forwarding via the controls service** (§1.4) | service | M | High | Without it, 1–2 work for keyboard only. Spike first. |
| 4 | **Notification service: lanes, queue, dedupe, rate limit, history** (§3) | service + intent + components | M | High | The most-called intent on every server; spam and mismatched stacks are the most visible failure (`research.md` §6). |
| 5 | **HUD visibility controller (show on need)** (§2.1) | service + pref | M | High | The v2 utilitarian baseline in behaviour, not just look; lets third-party HUD parts join the same reveal rules. |
| 6 | **Menu shell: tabs, breadcrumb, detail pane, action bar** (§4.1) | components + intent fields | M | High | One navigation grammar for every menu from every library; the action bar makes 1 visible everywhere. |
| 7 | **Uniform feedback slabs + item add/remove batching** (§5.3, §5.5) | intent lanes + components | S–M | High | Cheap, and makes new scripts look native immediately (`v2.md` §4.5). |
| 8 | **Hold-to-confirm + timing prefs** (`holdToConfirm`, `notifyDuration`, `challengeAssist`) (§5.1–5.2) | component + prefs | S | Med–high | Safety for destructive actions, and the accessibility alternatives XAG and GAG ask for. |
| 9 | **Settings framework: pref schema → generated settings, presets, keep/revert** (§4.4) | service + components | M | Med–high | Every resource's options in one place, controller-usable, with presets; turns prefs from console commands into product. |
| 10 | **Minimap frame, compass ring, waypoint tag, blip helper** (§2.4) | components + Lua helper | M | High | Already the v2 flagship. Ranked here only because it is planned work; the systems part (blip hygiene, peek-to-expand) is small. |
| 11 | **UI sound service with an identity palette** (§6) | service + theme field | M | Medium | The biggest "premium feel" gain per byte, but unproven in CEF (autoplay, latency); spike-gated. |
| 12 | **Inventory grid + stat comparison** (§4.5–4.6) | components | L | Medium | High value where used (inventory, shops), but scoped to a few screens and overrides. |
| 13 | **Scene context + adaptive HUD contrast** (§7) | context + tokens + pref | S–M | Medium | Fixes the bright-sky failure systematically; small once tokens v1.1 lands. |
| 14 | **World markers with a shared budget** (§2.3) | intent + service + renderer | L | Medium | Coherent pins and labels across scripts, but the renderer choice needs an in-game spike and per-frame cost is real. |
| 15 | **Device layer: frame, peek, app modules** (§8) | components + surface type + protocol | L | Medium | Lets any phone or laptop share the identity; large, and phones are an established market, so it ships after the core. |

**Also worth noting, below the cut:**
- reward/loot reveal with tier tokens (§5.4; S, low–medium);
- the meta-effect layer (§2.2; S, low–medium);
- radial stable slots (§4.2; S, folded into existing `radial-menu`).

**Order of work** [I]:
1. 2 → 1 → 3 (the input foundation, behind one spike).
2. 4 and 7 (notify lanes reuse the toaster).
3. 6 → 9 (settings use the menu shell).
4. 5 alongside v2 step 2 (with 10).
5. 8 anywhere.
6. 11, 13, 14, 12, 15 as their spikes clear.

Each step ships on its own, which follows the repo's rule.

---

## 10. What needs an in-game spike

Each spike runs on a real client, gets measured, and records numbers in the PR (the host benchmark is the
model).

1. **Gamepad while NUI is focused.**
   - Does the game still see the pad with `SetNuiFocus(true, true)`?
   - Can Lua read disabled frontend controls and forward presses? What is the press → paint latency?
   - Does `navigator.getGamepads()` see anything in CEF? (Expectation: unreliable; don't build on it.)
2. **Device detection and glyphs.**
   - Does the "using keyboard" pad native flip reliably on first input?
   - Does `GetControlInstructionalButton` return pad glyph ids for key-mapped commands with a secondary pad
     binding?
   - Build the full `b_NNN` table.
3. **Key repeat feel.** Initial delay and rate for held d-pad and arrows in long lists, at 60 and 144 fps.
4. **Audio in CEF.**
   - Does `AudioContext` start without a user gesture?
   - Press → sound latency; CPU with a suspended context; memory for a 300 KB palette.
   - Does game pause, alt-tab or the game's master volume affect NUI audio?
   - The cost of `PlaySoundFrontend` from a page callback vs from Lua.
5. **World markers.**
   - DUI sprite drawn per frame from Lua vs NUI projection: resmon with 8 pins, jitter at 150 km/h, and
     memory per DUI.
   - Occlusion raycast cost at 4 Hz × 8.
6. **Notification load.** 20 notifications in 2 s from three resources: confirm dedupe, rate limit and the
   frame cost of the stack's enter/exit transitions on Chromium 103.
7. **HUD reveal transitions.** Frame cost of fading 6–8 HUD parts at once over the game. Text-shadow vs
   4-direction shadow outline cost on 30+ text nodes (the snow scene).
8. **Scene detection.** Which natives give clock, weather transition and interior cheaply. Does a 10 s poll
   cost anything measurable?
9. **Spatial nav at scale.** Rect reads per press on a 120-slot two-pane inventory at 1280×720 and
   2560×1440; any visible hitch.
10. **Focus restoration across resources.** When a renderer in the runtime frame closes over a bespoke
    screen, does DOM focus return to the bespoke page's remembered element (the iframe focus handoff)?

**What would change this plan.**
- If spike 1 shows the pad can't be read while NUI has focus: menus would have to run unfocused (Lua owns
  input, the page only draws), which changes the surfaces model.
- If spike 4 shows NUI audio isn't reliable: the sound service ships with game frontend sounds only, and
  identity palettes wait.
- If spike 5 shows DUI is cheap: world markers move up the roadmap.

---

## Sources

Fetched and used:
- Xbox Accessibility Guideline 107, Input: https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-107-input.md
- Xbox Accessibility Guideline 112, UI navigation: https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/112
- Xbox Accessibility Guideline 113, UI focus handling (mirror): https://dotnet.territoriali.olinfo.it/en-us/gaming/accessibility/xbox-accessibility-guidelines/113
- Xbox Accessibility Guideline 114, UI context: https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-114-ui-context.md
- Xbox Accessibility Guidelines index (v3.2; titles of 103, 116, 117, 118): https://devdocs.xbox.com/build/game-principles/accessibility/xbox-accessibility-guidelines.md
- Game Accessibility Guidelines (full list, basic/intermediate pages): https://gameaccessibilityguidelines.com/?p=3102 · https://gameaccessibilityguidelines.com/?p=21 · https://gameaccessibilityguidelines.com/?p=17
- Unreal Engine, Common UI overview: https://dev.epicgames.com/documentation/unreal-engine/overview-of-advanced-multiplatform-user-interfaces-with-common-ui-for-unreal-engine
- Unreal Engine, CommonUI input technical guide: https://dev.epicgames.com/documentation/unreal-engine/commonui-input-technical-guide-for-unreal-engine
- Steamworks, Steam Input getting started (glyphs, golden rules): https://partner.steamgames.com/doc/features/steam_controller/getting_started_for_devs
- CSS Spatial Navigation Level 1 (Editor's Draft): https://drafts.csswg.org/css-nav-1/
- Norigin Spatial Navigation, concepts: https://devportal.noriginmedia.com/docs/Norigin-Spatial-Navigation/guides/concepts
- FiveM docs, input mapper parameter IDs: https://docs.fivem.net/docs/game-references/input-mapper-parameter-ids/
- FiveM docs, instructional buttons: https://docs.fivem.net/docs/game-references/instructional-buttons/
- FiveM docs, full-screen NUI (focus stack): https://docs.fivem.net/docs/scripting-manual/nui-development/full-screen-nui/
- FiveM docs, Direct-rendered UI (DUI): https://docs.fivem.net/docs/scripting-manual/nui-development/dui/
- Cfx forum, RegisterKeyMapping with NUI focus (GetControlInstructionalButton, `t_`/`b_` codes): https://forum.cfx.re/t/how-to-advanced-registerkeymapping-with-nuifocus-in-true/4778790
- Cfx forum, IsControlPressed stuck when activating NUI: https://forum.cfx.re/t/iscontrolpressed-stuck-when-activating-nui/4909965
- Cfx forum, NUI at world coords: https://forum.cfx.re/t/is-it-possible-to-display-a-nui-at-specific-coords/5196217
- Cfx forum, DepthUI holographic UI: https://forum.cfx.re/t/depthui-holographic-ui-system-free/5322639
- Cfx forum, 3D/spatial audio with NUI (cost while playing): https://forum.cfx.re/t/release-3d-spatial-audio-with-nui/2459006
- Cfx forum, xSound (URL delay, vehicle lag reports): https://forum.cfx.re/t/release-xsound-audio-library-for-fivem/1190605?page=5
- Cfx forum, PlaySoundFrontend (audio banks): https://forum.cfx.re/t/playsoundfrontend/246355
- Cfx forum, LB Phone (features, custom apps, resmon): https://forum.cfx.re/t/esx-qb-ox-standalone-lb-phone-advanced-performance-friendly-phone/4943569
- Cfx forum, NPWD (features, notifications, perf): https://forum.cfx.re/t/free-npwd-standalone-phone/4796066
- NPWD on GitHub: https://github.com/project-error/npwd
- FiveMX, FiveM phone scripts comparison: https://fivemx.com/compare/fivem-phone-scripts-comparison
- web.dev, Getting started with Web Audio API: https://web.dev/webaudio-intro?hl=hi
- Audiokinetic, Approaching UI audio from a UI design perspective, part 1: https://www.audiokinetic.com/en/blog/approaching-ui-audio-ui-design-perspective-1
- GDC 2026, "Civilization VII": Impactful UI Sound Design at Scale (abstract): https://schedule.gdconf.com/session/civilization-vii-impactful-ui-sound-design-at-scale/915690
- GDC Vault, Tenacious Design and the Interface of Destiny (abstract): https://www.gdcvault.com/play/1023460/
- GDC Vault, Cutting Apart the Diegetic Interface (abstract): https://www.gdcvault.com/play/1027158/Cutting-Apart-The-Diegetic-Interface
- Kotaku, the evolution of Destiny's UI: https://kotaku.com/watch-the-evolution-of-destiny-s-user-interface-1782289001
- Mein-MMO, Destiny's sticky UI: https://mein-mmo.de/en/destiny-von-klebrigen-ui-elementen,89554
- Game Developer, Game UI discoveries: what players want: https://www.gamedeveloper.com/design/game-ui-discoveries-what-players-want
- Game Developer, GDC 2019 UI/UX talks: https://www.gamedeveloper.com/design/gdc-2019-offers-a-wealth-of-ui-ux-talks-to-help-you-build-better-games-
- The best HUDs in gaming (blog): https://thereisnosleep.bearblog.dev/the-best-huds-in-gaming/
- Can I Play That, Ghost of Tsushima accessibility review: https://caniplaythat.com/2020/07/29/ghost-of-tsushima-accessibility-review/
- Frontier forums, text halo for bright backgrounds: https://forums.frontier.co.uk/threads/text-halo-outline-to-improve-readability-against-bright-backgrounds.297712
- Leadwerks, improving HUD readability: https://www.leadwerks.com/community/blogs/entry/591-improving-hud-readability
- UEFN Central, optimized in-game notifications: https://uefncentral.com/pl/blog/optimized-in-game-notifications-uefn
- Callahan, Hopkins, Weiser, Shneiderman, An empirical comparison of pie vs. linear menus (CHI 1988): https://sites.umiacs.umd.edu/node/16962
- Touch means a renaissance for radial menus (summary of Buxton/Kurtenbach marking-menu results): https://www.goodreads.com/author_blog_posts/2729103-touch-means-a-renaissance-for-radial-menus
- Game Informer, the surprising origins of loot rarity colors: https://gameinformer.com/2019/05/18/the-surprising-origins-of-loot-rarity-colors
- DEV, why holding buttons beats confirmation dialogs: https://dev.to/tomj/why-holding-buttons-is-superior-to-confirmation-dialogs-in-ux-design-1fic
- Naughty Dog, what are accessibility presets: https://feedback.naughtydog.com/hc/en-us/articles/360059851532-What-are-Accessibility-Presets
- Blue Shutter devlog, video settings keep/revert timer: https://conquiri.itch.io/blue-shutter/devlog/960457/-devlog-making-video-settings-smarter-and-safer
- GameDev.net, inventory management: grid vs list: https://gamedev.net/forums/topic/669150-inventory-management-grid-vs-list/
- AlternativeTo, Game UI Database 2.0 (screen types, HUD-element filters, inspector): https://alternativeto.net/news/2024/8/game-ui-database-2-0-launches-with-over-55-500-screens-and-enhanced-tools-for-ui-designers/

Repo sources used for constraints: `docs/protocol.md` §5.7 (message costs, `NUI.stream`, rAF rate),
`docs/design/v2.md`, `docs/design/research.md`, `docs/architecture.md`.

Blocked or not fetchable (worth reading manually):
- citizenfx natives docs on GitHub (`IsUsingKeyboardAndMouse`, `GetControlInstructionalButtonsString`, `PlaySoundFrontend`): raw.githubusercontent.com paths not allowed this session.
- Material Design snackbar guidance (m2.material.io redirect) and the Dalamud toast API page (redirect).
- PlayStation accessibility guidelines for developers (partner portal, not public).
- Game UI Database itself (gameuidatabase.com): browse its HUD, notification, inventory and settings filters for visual references; it was used here only via its 2.0 feature summary.
