# Foundation 2: what a universal design system needs to absorb any server's

*Oct 22, 2026. From studying two real FiveM design systems the owner built (a 4-vibe moodboard and a full
"Living Gem" HUD system), read as examples of what servers will want to express. Not a source of truth: we took
the patterns, not the look. This is the target for tokens 1.4 and the components that read them. Lanes:
[`../next/dispatch.md`](../next/dispatch.md). Today's tokens: [`../tokens.md`](../tokens.md).*

## What the two systems taught us

1. **Palette and treatment are separate axes.** The moodboard showed one palette drawn four ways (glass neon,
   tactical plate, soft modern, bold arcade). The colour stays the server's identity; the *treatment* (material,
   radius, stroke, type case and slant, focus style, motion feel) is a separate choice. Today a nuikit identity
   bundles both, so a server can't keep its colours and borrow Arcade's treatment.
2. **Hue is a role, not a colour.** The HUD system's best idea: a `Hue` collection whose modes are *roles*
   (Brand, Neutral, Health·Danger, Armor, Hunger·Warning, Thirst·Info, Stress·Identity, Stamina·Success, Oxygen),
   each resolving one ramp: `solid / deep / line / tint / glow / alert / grad-a / grad-b`. Components never pick a
   colour; a frame sets the role. Game stats and status share one axis (health = danger, stamina = success).
   Factions (police, EMS, mechanic, gang, civilian, staff) and rarity (common → legendary) are more role sets.
3. **Materials belong to contexts.** HUD glass (blur 20, rounded) and menu glass (blur 32, square, optional
   scanlines and a slash) are different materials, not different colours. "Day" mode isn't a light theme: it only
   raises opacities so text holds up over a bright game sky.
4. **Values are data, never variants.** Every component declares what its fill level *means* (hold progress,
   cooldown left, time left, amount, or none) and takes it as one number. The Figma file baked levels into variants
   (Rest 52%, Alert 17%) and had to rebuild the liquid twice to work around it: the lesson is the contract.
5. **Game-native states.** One vocabulary everywhere: `rest / focus / hold / confirm / disabled / alert`. No
   hover-first thinking: focus is the controller/keyboard highlight, hold is press-and-hold with visible progress.
6. **Behaviour is tokenized.** Alert thresholds (20%, fuel 15%), notify durations by severity (info 4 s, danger
   7 s), hold and cooldown times, the delay before an idle HUD retracts. Servers tune these as much as colours.
7. **Attention is budgeted.** "Neon budget 1": at most one glowing element on screen; alerts speak by tint and
   line, focus by halo; at most one focused hint; a decorative slash at most once per full-screen moment.
8. **Layout is zones with intent.** Lettered regions (status, map + alerts, vitals, vehicle + hints, prompts,
   interaction) with max boxes, a 48px HUD safe area vs a 116px menu margin, and *situations* (rest, moment,
   driving, interaction, menu) deciding which zones are populated. A modal is "the current screen + dim + dialog",
   never a new screen. State growth keeps its anchor (vitals grow upward from the bottom edge).
9. **Motion is per step.** Rest → focus → hold → confirm → gone, each with a duration, easing and what animates;
   named eases (standard, expand, retract, spring, breathe); a ladder (confirm 90, fast 120, base 180, retract 220,
   slow 280, fill 420, pulse 1000 ms); an "instant" profile for reduced motion.
10. **What broke in Figma breaks in code too:** effects not bound to tokens, absolute positions, one resolution,
    duplicated backdrops, data baked into variants. nuikit's rules already forbid most of these; the rest are below.

## The foundation (tokens 1.4)

The hierarchy stays (identity → semantic → component → resource config → player prefs). Inside *identity* it
splits, and new families join, all with defaults so a plain TweakCN paste still compiles to today's Graphite.

| Layer | New in 1.4 | Notes |
|---|---|---|
| **Palette** | the colours a theme sets today | unchanged |
| **Treatment** | `--nk-treatment: glass \| plate \| soft \| slab` | a preset that fills material, radius, stroke, type case/slant/tracking, focus style and motion feel as *defaults*; any value the theme sets wins. Identities become palette + treatment pairs (Arcade = its palette + slab) |
| **Roles (hue)** | `data-hue="<role>"` on any element → `--hue-solid/-deep/-line/-tint/-glow/-alert/-grad-a/-grad-b` | the compiler derives each ramp from one `--role-<name>` colour (alphas fixed per step, each overridable). Role sets: vitals (health, armor, hunger, thirst, stress, stamina, oxygen), status (info, success, warning, danger), faction (police, ems, mech, gang, civ, staff), rarity (common, uncommon, rare, epic, legendary), brand, neutral. Status and vital roles alias by default (health → danger) |
| **Materials** | `--nk-material-{hud,menu,overlay}-{opacity,blur,radius,edge,texture}` | context surfaces; `texture: none \| scanlines`; `--nk-slash` decorative cut for menus. HUD and menu read their own material |
| **Legibility** | `--nk-legibility: auto \| night \| day` | `day` raises surface opacity and hairlines (not a light theme). `auto` follows the game clock (nuikit_hud sends it) |
| **Focus** | `--nk-focus-style: ring \| halo \| tint \| fill \| invert \| bar` | one token for every component's focus (today `--nk-row-indicator` covers rows only) |
| **States** | `rest / focus / hold / confirm / disabled / alert` as `data-state` on every interactive component | `hold` draws progress (`--nk-hold-style: bar \| ring \| fill`), `confirm` a short pop (`--nk-confirm-scale`) |
| **Level** | `--level: 0–1` set from data + `--nk-level-style: bar \| ring \| liquid \| slab \| pips` | meters, vitals, prompts (hold), notices (time left), buttons (cooldown) all read the same contract. Each component documents what its level means |
| **Behaviour** | `--nk-alert-threshold: 0.2`, `--nk-fuel-threshold: 0.15`, `--nk-notify-ms-{info,success,warning,danger}`, `--nk-hold-ms`, `--nk-cooldown-ms`, `--nk-rest-delay` | servers tune them in theme.css; resources may override per surface; players get the timing ones as prefs |
| **Attention** | `--nk-glow-budget: 1` | the runtime gives the glow to the top surface's focused element only; `nuikit check` warns on a page that glows more than one thing |
| **Motion steps** | `--nk-ease-{standard,expand,retract,spring,breathe}`, `--nk-time-{confirm,retract,fill,pulse}` added to the ladder, `--nk-motion-profile: full \| reduced \| instant` | enter/focus/hold/confirm/exit each pick from these |
| **Layout** | zone names `status / map / vitals / vehicle / prompts / interaction / toasts` with default boxes; `--nk-safe-hud`, `--nk-safe-menu`; situations `rest / moment / driving / interaction / menu` | builds on screen zones: parts declare a default zone, `Config.parts` and `/hud edit` remap it; a situation sets which zones show and the density |
| **Layers** | `--nk-z-{world,hud,scrim,surface,dim,dialog,system}` | a modal = the current surface + `dim` + `dialog` |
| **Offsets** | `--nk-hang-{md,lg}`, `--nk-focus-shift` | badges and gems that break a panel edge; the focused row's nudge |

Rules that come with it:
- **Every effect binds to a token** (shadows, glows, halos, gradients), never a literal in a component.
- **Data is a prop or `--level`, never a variant.** Variants are for treatment and state only.
- **Identical anatomy across variants** (one DOM per component; state changes attributes), so motion can tween.
- **Anchors and zones, never absolute positions**; every surface checked at 1280×720, 1920×1080, 2560×1440.
- **Component spec template** (registry meta and each file's doc comment): role, anatomy, props, *level means*, rules.
- **A legibility fixture**: the site and bench render HUD parts over a bright, busy world backdrop.

## What a real server's codebase taught us (wave 3)

From reading a full RP server's own resources (24 of them, a clean-room framework, a design-system resource and
many reskinned paid scripts), read for patterns only. The design system unified the *look* across resources but
never the *behaviour*: NUI focus is juggled in 20 resources, Escape in 18, input dialogs in 18, toasts in 11,
progress in 11, key mappings in 13, script cameras in 10, settings in KVP in 8. That gap is nuikit's market.

Patterns we adopt:
- **A collapse engine** for clustered indicators (vitals, voice): at rest only the icon; a change opens a chip for
  `--nk-rest-delay`; changes within a batch window join one stack; critical first, then biggest change; at most N
  chips, then "+N"; per-key opt-outs. One primitive, used by the HUD and anything that clusters.
- **Slots that continue across resources**: a cluster (the vitals row) exposes slots another resource (voice, radio,
  a job) can join, so independent pages read as one cluster.
- **A settings service**: settings declared as rows (`key`, label, options or range), shown as a live-preview draft
  → save → reset; saved per player in KVP *merged over defaults with a schema version* (never wiped by an update);
  **presets** as patch bundles (Standard, Streamer, Performance, Cinema); server **feature flags** that hide UI
  parts without deleting them. The HUD editor and the pause settings both sit on it.
- **Per-cluster scale from its own corner** (`transform-origin` at the anchor), so scaling never moves anchors.
- **Skins**: a migration layer that re-points a third-party page's own CSS variables at nuikit tokens (looks only),
  for resources nuikit doesn't override yet.
- **Interaction ladders**: prompts go dormant → aware → focus → hold → confirm; a toast queue policy (one at a time,
  a capped queue, shorter dwell while others wait); change-only DOM writes.
- **Compat shims**: a resource can keep calling a server's old export names (`exports['x']:Notify(...)`) and land in
  nuikit's intents, so adoption is a config change, not a rewrite.

What a serious server needs before adopting: an adapter SDK for its own framework, token import from its Figma
variables / theme, export shims, a guaranteed old-CEF profile, world-space screens (DUI) and blocks it builds
in-house today (job tracker / task panel, NPC dialogue, MDT, phone shell, bodycam overlay, radio, storefront, garage
terminal, bank/ATM, character select and spawn).

## Who builds what

| Lane | Takes |
|---|---|
| C platform | the compiler and schema for every 1.4 family above (treatment presets, role ramps, materials, legibility, behaviour, motion steps, layers, offsets), DTCG file, `docs/tokens.md`, the glow-budget runtime rule and `nuikit check` warning |
| E kit | states (`data-state`, hold/confirm drawing), `--nk-focus-style`, the `--level` contract and level styles in meter / vital-chip / progress-ring / notice / key-prompt / button, `data-hue` on vitals and chips, the spec template in registry meta, the legibility fixture on the site |
| B HUD | vitals and cluster on roles, zone names + default boxes on top of `Config.parts`, situations with `--nk-rest-delay` retract, legibility `auto` from the game clock, anchor-preserving growth |
| D screens | overrides on materials (menu material for sheets and dialogs), modal = dim + dialog, notify durations by severity from behaviour tokens |
| F showcase | pause and inventory on the menu material, slots on rarity roles, the inventory's level contract (durability, weight) |

Order: C ships the tokens first (defaults equal today's look), then the others adopt them. Each identity gets a
treatment; Studio is `soft`, Arcade `slab`, Vector `plate`, Velvet and Graphite `soft`/`glass` by taste.
