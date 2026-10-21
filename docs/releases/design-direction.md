# nuikit design direction: the systems behind "premium"

This was written after two days of building, then judging in game, on the owner's server (0.7.0 to 0.8.0). It's not a list of fixes.
It records what we learned about **why** some things felt premium and others didn't, and turns each lesson into a pattern the
platform can hand to every server author. The themes we tried (Signal, Vector, Velvet, Arcade, Street) were probes. The
principles below held under all of them, so they belong to nuikit, not to any one look.

---

## 1. The core thesis

**Premium is coherence in motion.** Nothing we built felt premium because of its colour or font. It felt premium when every part of
the screen behaved as if it belonged to one material with one set of physics: the same weight, the same timing, the same way of
arriving and leaving, the same response to a touch. A theme only changes the material's surface; the physics are the product.

Three corollaries came up again and again:

1. **Subtle beats spectacular.** The camera that swung round to the player's face, the studio light and the always-pulsing dot all
   got cut. Premium never makes the player notice the UI working. It moves just enough to explain itself, then gets out of the way.
2. **Nothing appears or disappears without a cause you can see.** Every change has an origin (an edge, a neighbour, a hub, a value) and
   a direction. Snapping and popping are the two strongest "cheap" signals.
3. **One family, many expressions.** The owner never asked for more kinds of things; they asked for fewer kinds, more consistently
   applied: one chip, one sheet, one row, one roll. Variety comes from tokens, not from new components.

---

## 2. Pattern families to systemize

Each family below is a set of *decisions* a platform should make once, expose as tokens or primitives, and let authors compose.
The aim is that a server author never hand-tunes an animation or a margin. They pick an identity and the system answers.

### 2.1 Motion: the physics layer

Think of motion as a small, fixed vocabulary with tunable constants, not as per-component animations.

| Primitive | What it means | Where we used it | What to systemize |
|---|---|---|---|
| **Enter** | arriving from a cause (an edge, a parent, a hub) | sheets slide from their edge; radial fans from the hub; rows rise | an `origin` per surface type; distance in rem, not px; opacity follows position |
| **Exit** | leaving towards a cause, faster than entering | the sheet slides out; vitals tuck under their neighbour | the exit/enter duration ratio (~0.6); exits never just fade away |
| **Retarget** | a new value interrupts a motion already running | the speedometer reels, a group reversing mid-exit | every animation is interruptible from its current state; never queued, never restarted from zero |
| **Roll** | a value changes in place | TextRoll/NumberRoll (location, money, gear, heading) | vertical only; alignment per layer; width changes move the neighbours; clip on y only |
| **Sweep** | a state fills a shape | row hover, the selected bar, the voice chip filling | a fill has a direction (leading edge, bottom-up), never a fade |
| **Settle** | arriving with physical weight | the press release, notifications closing a gap | a spring is part of the identity (`snap`, `spring`, `stepped`) |
| **Calm** | a live signal shown at a human rate | speed at most 10 Hz with smoothing and hysteresis; heading at most 8 Hz | a display rate and dead-band per live value; the raw data rate is never the display rate |

Constants every identity should define: base duration, ease curve, spring stiffness/bounce, the stagger step and the **group budget**
(about 300ms total, however many children). The `motion off` and reduced-motion branches are part of the definition, not an afterthought.

### 2.2 Choreography: how groups move

Single animations were never the problem; groups were. The owner's most "sophisticated" reactions came from sequencing:

- **Order carries meaning.** In, in reading order; out, in reverse (last in, first out). The eye follows the sequence as a story.
- **Layering sells depth.** A leaving child passes *under* its neighbour; stacks show their depth while moving.
- **Budget, not step.** A group's total time is fixed; the per-child delay shrinks as the group grows. Ten slots and sixty slots feel equally quick.
- **Containers move with their content.** A row that loses a member closes up during the motion, not after it, so there's no jump at the end.
- **Shared timeline across layers.** Fill, ring, text colour and indicator are one moving layer (the list-menu lesson). If two parts of
  one state move on different clocks, the screen feels broken even when each part is fine on its own.

Systemize: `<Stagger>` / `useStaggerItem` as the only way groups animate; built-in patterns (`rise`, `pop`, `fold-into-neighbour`,
`fan-from-origin`, `slide-into-place`) so authors choose intent, not keyframes.

### 2.3 Interaction states: the feel of touch

Hover, focus, press, active, selected and disabled are a **state machine with motion on every edge**, not a set of colours.

- **Hover:** a gentle *sweep* of the fill from the side the pointer came from, plus the text easing its colour.
- **Focus (keyboard/controller):** the same visual as hover, driven by selection; there is only ever **one** lit row (the admin-menu bug taught this).
- **Press:** a short dip (~0.97) and a release governed by the identity's spring. It fires the same from mouse, Enter, Space and the controller.
- **Active/selected:** a stronger, settled version of hover; the indicator *glides* between items rather than reappearing.
- **Activation of a live element** (talking on voice, a vital crossing a threshold): fills *rise*; colour change is the last thing, not the first.

Systemize: one interaction state machine in the kit, applied by default to every row, button, chip, tab and slot, with tokens for
sweep direction, press depth, spring and the indicator style (`fill | bar | ring`).

### 2.4 Surfaces and layout: where things live

- **Two placements, one family:** *flush* when the game is paused or replaced (one at a time: pause, the full map, character select), and
  *floating* when the game keeps running (everything else). Floating surfaces are inset by the same edge token as the HUD, so the whole
  screen shares one margin.
- **The sheet is the window primitive.** Sub-pages swap *inside* the same sheet with a back row; no stacking of cards. A system has one
  sheet per side at most; a second sheet appears only as a paired view (inventory ↔ container).
- **Rows, not cards.** A 48px row with hairline dividers is the unit of content; sections are separated by space and separators, not boxes.
  Every extra rectangle costs calm.
- **Trays for actions.** Contextual actions and key hints float in a bottom tray detached from the screen edge.
- **The clear stage.** Surfaces report the area they leave free (`pause:preview:frame`, `inventory:frame`), and the camera and world
  framing respond to it. Layout and camera are one system.
- **Spatial memory.** Things open from the side they belong to (your stuff on the left, the world's stuff on the right) and always from
  the same side, so the player's hands learn the screen.

Systemize: edge-sheet (flush/floating, fit/full, paged), tray, row, section; a layout grammar ("left = self, right = world, bottom = actions,
top-right = HUD") that the doctor can check.

### 2.5 Shape, edge, angle and depth: the material

These are the dials that make an identity, and they should be **tokens, never per-component CSS**:

| Dial | Range we explored | Lesson |
|---|---|---|
| **Corner** | radius, chamfer/cut, pill, square | one corner language per identity, applied to *everything*, including traced progress outlines and the selection indicator |
| **Edge** | hairline, 2px stroke, inset brand edge, none | the stroke weight sets the tone more than the colour does; pick one weight per identity |
| **Angle** | `--nk-skew` 0 to about 12° | angle is a personality dial; text stays upright inside skewed slabs unless the identity is italic |
| **Depth** | none, soft, deep, hard (solid offset) | shadow style is a strong identity signal; hard shadows read as "game", soft as "product" |
| **Surface** | opacity, tint, gradient, edge light | flat slabs read louder and more legible over a moving game scene than glassy ones |
| **Shape of value** | outline trace, fill, bar | a value is drawn *on the element's own shape* (the traced outline), never as a foreign circle inside a square |
| **Typography** | weight, case, tracking, italic, condensed | display, label and number roles are tokenized separately; numbers get their own face and tabular behaviour |

The VitalChip anatomy (Shape → Level → Icon → Label → Pop, all derived from one SVG path) is the model for any compound element:
**one geometric source of truth, many derived layers**. A new shape is one function; it automatically gets correct borders, clips, fills,
traces and label anchors.

### 2.6 Information density and hierarchy

- **Primary, persistent signals** stay always on (comms/voice, the minimap, location).
- **Self-management signals** (vitals, fuel, ammo) surface only on change or threshold, explain themselves briefly (a pop with the delta),
  and leave in sequence.
- **Fewer words:** the area plus one street, not three lines; icons with a label only when it's needed.
- **Numbers are first-class:** they get rolling, calm rates, dimmed leading zeros and a dedicated numeric face.

Systemize: a visibility policy per signal (`always | change | threshold`), pop rules (merge, minimum delta, duration) and a density
token per identity.

### 2.7 Glue over walls

A platform wins by adopting the conventions servers already have, not by asking them to adopt its own:

- one image resolver for items, clothing, vehicles and weapons, configured with templates, with silent fallbacks;
- overrides that keep every POST identical, so they're drop-in;
- surfaces and cameras that cooperate across resources (the inventory reports its frame to the pause camera);
- the native screens (pause, map, settings) replaced completely, with the same data the player expects.

Systemize: adapters and resolvers as first-class extension points, documented as "how to plug in what you already run".

---

## 3. A token map worth building towards

A server author should be able to describe an identity in about 40 decisions and get everything else for free:

- **Material:** surface, opacity, edge weight, edge style, corner style and size, skew, depth style, glow.
- **Type:** display/body/number faces, weights, case, tracking, italic.
- **Colour:** neutral ramp, primary, a vital and status palette, scrim.
- **Motion:** duration, ease, spring, motion feel (`snap | spring | stepped`), stagger step, group budget, exit ratio, roll style,
  sweep direction, press depth.
- **Live data:** display rates and dead-bands per signal class.
- **Layout:** edge inset, row height, density, sheet widths, tray placement.
- **Camera and light:** framing mode (`current` default), lighting preset (`off` default).

Everything a page draws should be traceable to one of these, and the doctor should flag any value that isn't.

---

## 4. Where this can go next

- **Motion as a published spec:** a page in the docs and an interactive playground where each primitive (enter, exit, retarget, roll,
  sweep, settle, calm, stagger) can be seen and tuned per identity, the same way colours are shown today.
- **An identity studio:** the theme studio grows from colours to the full token map above, with live preview of motion and interaction states.
- **Layout grammar checks:** the doctor learns the placement rules (one flush surface, consistent sides, trays detached) and warns.
- **Sound as part of feel:** UI audio cues (hover tick, press, open and close) as tokens tied to the same timing.
- **Haptics and controller:** the press-feel model extends naturally to controller navigation and vibration.
- **Job and resource templates:** a "job sheet" and a "shop sheet" built from the primitives, so the long tail of resources looks native
  without designing anything.
- **Patterns for live roleplay surfaces:** dispatch, phone, radio and EMS are all streams of events. The choreography and calm-rate
  rules apply directly and are the next place premium will be noticed.

---

## 5. One-line principles (for the top of design.md)

1. One material, one set of physics; themes change the surface, not the physics.
2. Everything arrives from a cause and leaves toward one; nothing pops.
3. Groups move in sequence within a fixed budget, layered.
4. States move: fills sweep, presses settle, the indicator glides, and it's one layer.
5. Live numbers are calm: smoothed, rate-capped, rolled vertically.
6. Sheets and rows, not cards; floating unless the game stops.
7. Values are drawn on the element's own shape.
8. Subtle beats spectacular: the camera never forces itself on the player, and neither does the light.
9. Glue over walls: adopt existing conventions, keep protocols identical.
10. If it can't be expressed as a token or a primitive, it isn't systemized yet.
