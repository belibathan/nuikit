# Design research: the premium FiveM UI bar (input to design language v2)

Date: 2026-10-20. Scope: what top-tier FiveM servers and creators do that reads as premium, what GTA V
already teaches players, and the common failures. Written for nuikit's design language v2 (see
`docs/design.md`, `docs/tokens.md`).

**Evidence tags.** Every claim carries one:
- **[V]** verified this session from a fetched source (listed in Sources).
- **[R]** recalled from general knowledge of GTA V / FiveM. Widely observable, but not fetched this session. Check it in game.
- **[I]** inferred: my recommendation or calculation, not a sourced fact.

**What's thin.** NoPixel publishes very little about its UI. No designer write-ups, specs or devblog text
with numbers were found. Most of the "NoPixel look" lives in videos and in the many clones it inspired.
Prodigy, ONX and GTA World have no public design write-ups I could find. Their sections here are mostly
[R]/[I], so treat them as hypotheses to check against footage, not as facts.

---

## 1. Findings

### 1.1 NoPixel (4.0 → V)
- **NoPixel V treats design language as a product release.** Its third development update was called
  "Visual Design Language" (early Sept 2026, ahead of the 8 Sept closed beta). It overhauled the HUD,
  inventory (adding quick-use item interactions), health and armor indicators, controller and settings
  menus, plus "a batch of accessibility improvements" [V gtaboom]. The wiki describes "cleaner menus
  across every system", a clearer minimap, and built-in keyboard and gamepad support [V nopixelv-wiki].
- **Full gamepad support** and a phone that switches between a compact handset and a larger tablet layout
  depending on the activity [V shockbyte]. NoPixel V runs through the Rockstar Games Launcher on its own
  framework. 4.0 and Public remain on FiveM [V shockbyte].
- **4.0's patterns became genre conventions** [R], and the clone ecosystem shows it: "NoPixel 4.0 inspired"
  HUDs on GitHub [V qb-hud, Kane-qb-hud], and "NoPixel 4.0 inventory/HUD/UI" listings on resale sites
  [V fivemx, vag.gg]. The conventions, all [R]:
  - **Third-eye targeting:** hold a key, aim at an entity, pick from a short option list. This became
    bt-target → qtarget → ox_target. ox_target's model is hold LAlt by default (toggle optional), optional
    left-click select, and an optional zone sprite [V ox_target docs].
  - **Radial menu** for contextual actions.
  - **Compact circular status icons** next to the minimap, shown only when relevant.
  - **Item-box toasts** when items are added or removed.
  - **Diegetic devices** (phone, laptop) for long tasks.
- **Read:** NoPixel's polish comes from one language applied everywhere, and from restraint (show state
  only when it matters). It doesn't come from any single flashy screen [I, consistent with V gtaboom
  framing "studio-grade polish" and "cleaner menus across every system"].

### 1.2 Premium creators (Tebex)
- **Unification is the selling point.** Lation's Modern UI sells one consistent set of shared components:
  alert dialog, input dialog, context menu, notifications, progress, skill check and text UI. Its stated
  problem is owners "tired of inconsistent UI styles across different scripts", and defaults are set once,
  server-wide [V lation]. A Cfx release thread makes the same argument: big servers have a homogeneous
  aesthetic, and mismatched designs make a good server look unprofessional [V cfx sleek].
- **Premium HUDs sell control and frugality.** JG HUD offers movable, resizable, recolourable components,
  layout export and import with a lockable server-wide default, AutoScale across resolutions and aspect
  ratios, ultrawide support (21:9, 32:9), and a movable minimap in or out of the safe zone. Its claimed
  cost is 0.01–0.02 ms idle and 0.02–0.06 ms driving in resmon. These are vendor numbers [V jgscripts].
- **"Native" is pitched as the ultimate in performance.** Aesir's dashboard uses Scaleform and claims
  0.00 ms idle. It says NUI HUDs "lag on tick because the browser update rate is decoupled from the game
  render loop", stretch on ultrawide, and ignore the player's safe zone. All vendor claims, no benchmarks
  [V aesir].

### 1.3 GTA V's own language (what players already expect)
All [R] unless noted. Check in game.
- **HUD layout.**
  - Minimap bottom-left, with health and armor bars along its bottom edge.
  - Help text top-left.
  - Cash, wanted level and weapon/ammo top-right.
  - Street, area and vehicle names bottom-right.
  - Subtitles bottom-centre.
  - Big moments ("WASTED", mission passed) centred, over a desaturated or blurred world.
  - The notification feed stacks above the minimap.
- **Safe zone.** A Display setting ("Safezone size") insets the whole HUD. `GetSafeZoneSize()` returns
  that scale. I recall a range of about 0.9–1.0; verify. Community minimap anchors exist to compute the
  minimap's rect across aspect ratios and safe-zone settings [V minimap-anchor README]. Premium HUDs
  advertise respecting it [V aesir, jgscripts].
- **Interaction.** Hold-to-open radial (weapon wheel, radio wheel). A list menu with a header and
  highlighted row (Interaction Menu, the origin of NativeUI-style menus). The phone slides up bottom-right.
  The pause menu has tabs across the top. Hold prompts show a filling ring.
- **Type.** The logo is Pricedown. UI and subtitles are neutral sans-serifs, widely reported to be Chalet
  (House Industries); the exact stack isn't officially confirmed [V madegooddesigns]. HUD text is white
  with a shadow or outline straight on the world, with no panel behind it.
- **Colour.** Mostly white and neutral, with saturated colour reserved for meaning: health green, armor
  blue, wanted red/blue, money green.

### 1.4 Platform constraints (FiveM NUI)
- **The browser.** NUI is CEF (Chromium) [V cfx NUI docs]. nuikit targets Chromium 103 (repo rule).
- **Blur.** `filter: blur` / backdrop blur appears not to be GPU-accelerated in CEF. One report saw heavy
  CPU load and a nearly unresponsive UI on a 5K display, and the `ui_blurPerfMode` convar isn't honoured
  at launch [V cfx blur thread]. The same is reported of backdrop-filter not working in some contexts
  [V cfx backdrop thread, title only].
- **Focus.** It's global. Many forum threads report a stuck cursor or focus, and chat/console input
  conflicting with NUI focus [V titles in cfx search results; R content].

### 1.5 Accessibility baselines (games industry, primary)
- **Minimum text body height** (lowest descender to highest ascender) at 1080p [V XAG 101]:
  - PC: 18 px
  - Console/TV: 26 px
  - Players should be able to scale text.
- **Contrast** [V XAG 102]:
  - 4.5:1 for standard text and UI.
  - 3:1 for large text: ≥36 px on PC at 1080p.
  - 7:1 in a high-contrast mode.
  - Over non-solid backgrounds, measure against the *lowest-contrast part*.
  - Offer backplates with adjustable opacity, or outlines.
- **Subtitles** [V GAG]:
  - Text: ≥46 px at 1080p, ≤40 characters per line, ≤2 lines, mixed case.
  - Backplate: solid or semi-opaque, plus an outline or shadow. Avoid white backplates.
  - Priority: readability beats art direction.

### 1.6 Motion
- **Durations.** Feedback 100–200 ms (press <150 ms), larger transitions 200–400 ms, toasts 2–4 s for
  non-critical messages [V gamineai].
- **Easing.** Ease-out to enter, a faster ease-in to exit, and 2–3 reusable easings. Don't stack large
  translate + rotate + scale [V gamineai].

### 1.7 UI taxonomy
- **The four types** [V gamedeveloper]:
  - Diegetic: phone, laptop, dashboard.
  - Spatial: target sprites, world markers.
  - Meta: screen-edge damage, blur.
  - Non-diegetic: HUD, menus.
- **When to use each:** use diegetic when the fiction supports it. Fall back to non-diegetic when the
  others would cost consistency or legibility [V gamedeveloper].

---

## 2. Principles (rules we can apply)

1. **One language, every surface.** Every UI on the server must be recognisably the same product: same
   panel, row, type scale, keys and motion. *Evidence:* NoPixel V shipped a "Visual Design Language"
   update across all of its systems [V]. Premium creators sell unification [V lation, cfx]. *For nuikit:*
   this is already the thesis. v2 should audit addons (ox_lib, ox_inventory, target) against it, because
   that's where servers break today.
2. **The world is the hero; UI earns its pixels.** Always-on HUD shows only what changed or what's
   critical. Hide full vitals, show them on change or threshold, and fade them back. *Evidence:* GTA V's
   HUD fades the minimap and bars when idle [R]. NoPixel-style status icons appear only when relevant [R].
   NoPixel V has "cleaner" HUD and menus [V].
3. **Respect GTA's map of the screen.** Don't fight players' muscle memory:
   - bottom-left: minimap and vitals
   - top-left: help and prompts
   - top-right: money, wanted, weapon
   - bottom-right: location and vehicle
   - bottom-centre: subtitles and progress
   - centre: only modal or big moments

   *Evidence:* [R] GTA V layout. Premium HUDs anchor to the minimap [V jgscripts, aesir].
4. **Read the game's safe zone, not a fixed margin.** Anchor HUD to `GetSafeZoneSize()` and the minimap
   rect, recomputed on resolution change. Keep `--nk-edge` as the *minimum*. *Evidence:* [V aesir,
   minimap-anchor, jgscripts]. *[I]* Expose the safe zone from Lua as a CSS variable.
5. **Size for the couch, not the desk.** Body text ≥18 px body height at 1080p, with a player text-scale
   preference. *Evidence:* XAG PC minimum is 18 px [V]. *[I] Tension with the current spec:* design.md
   uses 14 px body and 12 px labels. In a sans like Inter, glyph body height is about 0.9–1.0× the font
   size, so 14 px text is about 13 px, below the XAG PC floor. Recommendation for v2: 16 px body,
   13–14 px labels, 18+ for anything read in motion (HUD, prompts). Keep 12 px for non-essential meta
   only, and keep `--nk-scale`.
6. **Contrast is measured against the sky.** Text on the game must pass 4.5:1 against the *brightest*
   plausible background: midday sky, snow, white cars. Panels need enough opacity, and bare HUD text needs
   a shadow or outline. *Evidence:* XAG 102 lowest-contrast-region rule [V], GAG backplates [V]. *[I]*
   Make it a `nuikit check` rule: test theme tokens against a white (#fff) background as well as their own.
7. **Darken with scrims; don't blur in CSS.** Use a `--scrim` gradient or solid. If blur is wanted, ask
   the *game* to blur (screen-blur natives) from the owning resource, not CSS. *Evidence:* CEF blur is
   CPU-bound and can make the UI unresponsive [V]. *[I]* Spike the game-side blur's cost before relying on
   it.
8. **Colour means something.** Neutral surfaces; saturated colour only for status, vitals and the one
   primary action. *Evidence:* GTA V's white-and-neutral HUD with semantic colours [R]. XAG says don't rely
   on colour alone [V XAG 102 context]. *For nuikit:* already rule 2 in design.md. Add "pair every status
   colour with an icon or word".
9. **Fast, purposeful, interruptible motion.**
   - Feedback: ≤150 ms.
   - Panels: 150–220 ms in, roughly 30% faster out.
   - Full-screen: ≤400 ms.
   - Never block input on an animation.
   - Animate only opacity and small offsets.

   *Evidence:* [V gamineai]. nuikit's Chromium 103 transform caveat (repo rule). *For nuikit:* the 160 ms
   `nk-enter` fits.
10. **One focus owner, one Escape.** Only one surface takes input at a time. Escape closes the topmost
    surface only, then returns focus to where it came from. Never leave a cursor stranded. *Evidence:*
    many stuck-focus reports [V titles]. *For nuikit:* this is the runtime's job (surfaces). v2 should
    state it as a design rule too: every surface shows its close key.
11. **Controller is a first-class input.** Every surface must be fully usable with keyboard and d-pad:
    visible focus ring, logical order, and keys shown next to actions. *Evidence:* NoPixel V's full
    gamepad support and reworked controller menus [V].
12. **Contextual beats global.** Prefer world-anchored, short option lists (target eye, radial, hold
    prompts) over full-screen menus for in-world actions: 3–7 options, nearest first. *Evidence:* the
    third-eye → ox_target lineage [V ox_target, R history]. GTA's wheels [R].
13. **Long tasks live in devices.** Phone, laptop and tablet are diegetic frames for dense, long-lived
    apps (banking, messages, dispatch). Dense panels are for quick tasks. *Evidence:* NoPixel V's adaptive
    phone and tablet [V]. Diegetic UI guidance [V gamedeveloper].
14. **Cheap when idle.** An always-on UI should cost about 0 ms when nothing changes: event-driven
    updates, no per-frame `SendNUIMessage`, no idle animation loops. *Evidence:* the premium bar is
    advertised as 0.01–0.02 ms idle [V jgscripts, vendor claim]. *[I]* Measure nuikit HUDs in resmon and
    publish the numbers, as the host benchmark does.
15. **Players own their readability.** Text scale, motion off, HUD opacity and backplate opacity are
    player preferences that every UI honours. *Evidence:* XAG text scaling and backplate opacity [V]. GAG
    customisation [V]. *For nuikit:* prefs exist (`--nk-scale`, `--nk-motion`). Add backplate/HUD opacity.

---

## 3. Specs worth adopting (ranges, at 1920×1080; rem-based so they scale)

All [I] recommendations unless a source is cited.

| Area | Range | Basis |
|---|---|---|
| Body text | 16 px (15–17) | XAG PC 18 px body-height floor [V] |
| Labels / secondary | 13–14 px; 12 px only for non-essential meta | same |
| HUD values, prompts | 18–22 px, weight 500–600, with shadow | read in motion over the world |
| Big numbers (balance, timer) | 32–48 px, tabular | existing design.md |
| Subtitle-like text (radio, captions) | ≥46 px if it's truly a subtitle; else 18–24 px | GAG [V] |
| Line length | ≤60 characters for body; ≤40 for subtitles | GAG [V] (40) |
| Control height | 36 default, 40 list row, 32 minimum for any mouse target | existing; ≥32 for hit area |
| Controller focus | 2 px ring + background change; never colour alone | XAG [V] |
| Density | 6–10 rows visible in a list panel; 3–7 options in a target/radial | [I] Hick's law + ox_target |
| Panel width | 320–400 px (menus), 480–640 px (forms), ≤1200 px (inventory) | [I] |
| Contrast | 4.5:1 text, 3:1 large text and UI parts, measured vs #fff and vs a mid-grey sky | XAG [V] |
| Panel opacity over game | ≥0.92 for text panels; HUD chips ≥0.6 with text shadow | [I] needs testing on a bright scene |
| Scrim | 40–60% for modal over game; 70–85% for full-screen text (pause, death) | [I] |
| Motion | feedback 80–150 ms; panel in 150–220 ms ease-out, out 100–150 ms ease-in; full-screen 250–400 ms | gamineai [V] |
| Toasts | 4–6 s default (attention is on the world), 2–3 s for confirmations, sticky for actionable | gamineai 2–4 s [V], lengthened [I] |
| Hold-to-confirm | 0.6–1.2 s with a filling ring; cancel on release | GTA hold prompts [R] |
| HUD safe area | inset = (1 − safeZone) / 2 × width/height per side; plus `--nk-edge` 24 px minimum | GTA safezone [R], [V anchor README] |
| Layout grid (16:9) | 12 columns, 48 px outer gutters, 24 px gutters (column ≈ 130 px at 1080p) for full-screen surfaces | [I] |
| Idle cost | ≈0.00–0.02 ms resmon for always-on UIs | vendor bar [V jgscripts] |

**Resolutions.** Test at 1280×720, 1920×1080 and 2560×1440 (repo rule). Also check ultrawide (21:9),
where the HUD should hug the safe zone and centre-anchored panels must not stretch [V aesir, jgscripts].

---

## 4. Patterns by surface

**HUD**
- Anchor to the minimap rect and the safe zone.
- Show vitals as compact chips or arcs; reveal full detail on change or threshold.
- Status uses `--vital-*` plus an icon. Bare text uses a shadow, no panel.
- Vehicle info appears bottom-right or by the minimap only in a vehicle.
- No idle animation. Updates are event-driven.
- Let servers lock a layout; let players move or resize if the server allows [V jgscripts pattern].

**Notifications**
- One stack, one position per server: top-right or above the minimap, matching GTA's feed [R].
- Max 3–4 visible; collapse duplicates ("×3").
- Icon + title + one line, and status colour on the icon only.
- Item add/remove toasts show the item image and the delta [R NoPixel item box].
- Never steal focus.

**Menus / lists**
- Rows, not tiles: 40 px, icon + label + trailing meta or key.
- Header with title and back. Search when there are more than 10 items.
- Keyboard/d-pad first; the selected row uses `--accent`.
- Context menus open beside their origin with first-row alignment (already in design.md).
- Target eye and radial: 3–7 options, nearest or most likely first, a key hint visible.

**Dialogs / forms**
- Centred and modal over a 40–60% scrim.
- One primary action, Escape cancels, Enter confirms.
- Labels above fields; inline validation in one sentence.
- Destructive actions use the destructive variant plus hold-to-confirm for irreversible ones.

**Inventory**
- Two panes (self ↔ other), with a fixed hotbar (1–5) always visible.
- Drag, plus a click/key alternative (quick-use, split, give) for controller users. NoPixel V emphasises
  quick-use [V].
- Weight is a meter. Tooltips on focus, not only on hover.
- Item art is the only place fixed colours are allowed.

**Full-screen (pause, death, loading)**
- Own the whole frame: 70–85% scrim or `--background`, 48 px gutters, 12-column grid.
- Big type for the one fact that matters (respawn timer, server name).
- Calm motion (≤400 ms).
- Loading screens show progress and tips, with no autoplaying heavy video loops at high bitrate [I perf].
- Death screen: the timer and the one action (call EMS / respawn) are the point.

**World prompts**
- Short help prompts top-left, matching GTA [R], or near the target point.
- `Kbd` + verb ("E Open trunk").
- Hold actions show a ring.
- 3D-anchored labels only within a few metres; fade by distance and occlusion.
- Never more than one prompt per key in view.

---

## 5. What NOT to copy, and how to hit the bar with our own identity

**Don't copy:**
- NoPixel's (or any server's) exact layouts, iconography, colourways, logos, sound, or their
  phone/laptop app designs.
- The "NoPixel 4.0 UI/inventory/HUD" packs on resale and leak sites [V fivemx, vag.gg]. Many are
  replicas of proprietary work: a licensing and reputational risk.
- Rockstar marks: the Pricedown logo treatment, Rockstar/GTA logos, Rockstar HUD sprites and fonts
  (Chalet is a commercial House Industries font; don't bundle it).
- Lifting another creator's UI code or markup. This is also nuikit's clean-room rule for overrides.

**What to take instead:** the *conventions*, which are the shared language of the genre and of GTA
itself: positions on screen, hold-to-target, radial, list menus, devices for long tasks. Conventions aren't
proprietary. Expressions are.

**Same bar, own identity:**
1. **Identity comes from the theme and proportion, not ornament.** Server owners bring their brand via
   TweakCN tokens. nuikit's identity is its rhythm: the spacing scale, row/panel recipe, type ramp and
   motion. That's what makes 30 scripts read as one product.
2. **Use an open typeface** (e.g. Inter, Geist or similar OFL/open fonts) with tabular numerals, set as
   `--font-sans`. Let themes swap it.
3. **Use open icons only** (lucide, already in use), one stroke weight, 16/20/24 sizes.
4. **Polish through states, not effects.** Every surface needs complete states: empty, loading, error,
   disabled, focus, controller focus, low-vitals. Premium reads as "nothing is ever unstyled or broken",
   not as glow and blur.
5. **Publish proof.** Resmon numbers, contrast results, and screenshots at three resolutions on a bright
   scene. Premium creators sell numbers [V jgscripts]; we can show measured ones.

---

## 6. Common quality failures in typical FiveM UIs (and the nuikit answer)

| Failure | Evidence | Answer |
|---|---|---|
| Every script has its own look (fonts, radii, colours, positions) | [V lation, cfx sleek] | one theme + kit + adapters (core thesis) |
| Looks like a web page: white cards, browser scrollbars, default focus outlines, hover-only affordances | [R] | game-tuned panels, custom scrollbars, controller focus states |
| Stuck cursor / focus, Escape closing the wrong thing or nothing | [V cfx thread titles] | surfaces runtime: one owner, stacked Escape |
| Tiny text (10–12 px at 1080p), thin weights | [R]; XAG floor 18 px [V] | 16 px body, 18+ HUD, text-scale pref |
| Text unreadable over the sky or snow; translucent glass panels | XAG lowest-contrast rule [V] | opacity floors, shadows, contrast check vs white |
| CSS blur and glassmorphism tanking FPS or the UI | [V cfx blur] | scrims; game-side blur only after a spike |
| Heavy animation: long slides, bouncing, idle loops, transform on centred dialogs | [V gamineai]; repo Chromium 103 rule | one 160 ms enter, motion pref |
| HUD ignores safe zone, ultrawide or minimap; overlaps GTA's own HUD | [V aesir, jgscripts] | safe-zone + minimap-anchored layout |
| Per-frame NUI messages, costly idle HUDs | [V aesir claim; jgscripts bar] | event-driven, publish resmon |
| Colour-only status (red/green), no icon or text | XAG [V] | icon + colour + word |
| Notifications spamming and stacking forever, positions differing per script | [R] | one stack, cap, dedupe |

---

## 7. Open questions / what would change this
- **Text sizes in practice.** In game at 1080p with a real theme, do 16 px body and 18 px HUD feel right,
  or too big next to GTA's own HUD? Needs a side-by-side screenshot test.
- **Blur.** Are game-side screen-blur natives cheap enough to offer as a theme option? Spike before
  promising.
- **Safe zone.** The exact `GetSafeZoneSize()` range and the minimap rect math. The source
  (`MINIANCHOR.lua`) was blocked for fetching here; read it in the repo or test natively.
- **NoPixel V specifics.** Footage review of the actual beta UI would refine sections 1.1 and 4. Text
  sources describe *what* changed, not *how* it looks.

---

## Sources

Fetched and used:
- NoPixel V Overhauls UI, HUD and Inventory (gtaboom, Sept 2026): https://www.gtaboom.com/nopixel-v-just-overhauled-its-entire-ui-ahead-of-its-september-8-beta-289e
- NoPixel V Wiki: https://www.nopixelv-wiki.wiki/en
- What Is NoPixel V (Shockbyte): https://shockbyte.com/blog/what-is-nopixel-v
- qb-hud (NoPixel-inspired, GitHub): https://github.com/louairgh/qb-hud
- Kane qb-hud NoPixel 4.0 inspired (GitHub): https://github.com/rohKane/Kane-qb-hud-Nopixel-4.0-inspired
- ox_target docs: https://overextended.dev/docs/ox_target
- JG HUD: https://jgscripts.com/scripts/hud
- Aesir Vehicle Dashboard (Cfx forum): https://forum.cfx.re/t/paid-standalone-aesir-vehicle-dashboard/5381184
- fivem-minimap-anchor (GitHub): https://github.com/Beyond-Redline-Racing/fivem-minimap-anchor
- Lation, What is Modern UI: https://lationscripts.com/blog/what-is-modern-ui
- Cfx forum, Sleek loading screen (homogeneous aesthetic thread): https://forum.cfx.re/t/standalone-sleek-loading-screen-responsive-sleek-series/5166359
- Cfx forum, ui_blurPerfMode / blur performance: https://forum.cfx.re/t/convar-ui-blurperfmode-is-not-honored-on-launch-and-blur-effect-makes-ui-almost-unresponsive-on-hidpi-displays/2050335
- FiveM docs, NUI development: https://docs-backend.fivem.net/docs/scripting-manual/nui-development
- Xbox Accessibility Guideline 101, Text display: https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-101-text-display.md
- Xbox Accessibility Guideline 102, Contrast: https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-102-contrast.md
- Game Accessibility Guidelines, subtitles: https://gameaccessibilityguidelines.com/if-any-subtitles-captions-are-used-present-them-in-a-clear-easy-to-read-way/
- User interface design in video games (Game Developer): https://www.gamedeveloper.com/design/user-interface-design-in-video-games
- Game UI animation (Gamineai): https://gamineai.com/blog/game-ui-animation-creating-smooth-engaging-interface-transitions
- What font does GTA use (Made Good Designs): https://madegooddesigns.com/?p=9244

Seen in search results only (titles used as weak evidence; contents not fetched):
- Cfx forum, backdrop-filter not working: https://forum.cfx.re/t/backdrop-filter-in-fivem-not-working/4870890
- Cfx forum, NUI focus threads: https://forum.cfx.re/t/set-nui-focus-is-it-broke/90825 · https://forum.cfx.re/t/need-some-help-nui-mouse-cursor-stuck-screen/2887777 · https://forum.cfx.re/t/f8-console-and-setnuifocus/5055399
- NoPixel 4.0 replica listings: https://fivemx.com/nopixel-4-0-inventory-qbcore/ · https://vag.gg/threads/nopixel-4-0-ui.31561/
- Game UI Database (reference library for GTA V screens): https://www.gameuidatabase.com/about.php

Blocked from fetching (worth reading manually):
- Cfx best-practice performance thread: https://forum.cfx.re/t/best-practice-improve-your-resource-performance/105509
- MINIANCHOR.lua: https://github.com/Beyond-Redline-Racing/fivem-minimap-anchor/blob/master/MINIANCHOR.lua
- NoPixel V development updates (gtaservers.org, robots-disallowed): https://gtaservers.org/server/nopixel-v/development-updates
