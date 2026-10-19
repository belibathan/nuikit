# illenium-appearance NUI protocol — compatibility spec

Target: drop-in replacement for `illenium-appearance/web/dist` (upstream `main`, commit `1b003ec`, the copy Qbox ships; the shipped bundle is `web/dist/assets/index.b8e72b46.js`).
Scope: everything that crosses the boundary between illenium-appearance's client Lua (`game/nui.lua`, `game/customization.lua`, `game/util.lua`) and its NUI page, plus the UI behaviour the Lua side relies on.

> Clean-room note. illenium-appearance's licence restricts copying. This document describes the wire protocol and observable behaviour in our own words, worked out from the Lua handlers and by observing what the shipped page sends. It doesn't reproduce illenium-appearance code, markup, styles or locale text. Message names, field names, config flag names and numeric ranges appear only as interface facts.

Conventions:

- **Inbound** (Lua → UI): `SendNuiMessage(json.encode({ type = "...", payload = {...} }))`. The page receives a `window` `message` event whose `event.data` is `{ type: string, payload: any }`. Note `type`/`payload`, **not** the `action`/`data` shape most resources use.
- **Outbound** (UI → Lua): `fetch("https://" + GetParentResourceName() + "/<name>", { method: "POST", headers: { "Content-type": "application/json; charset=UTF-8" }, body: JSON.stringify(payload) })`, then `res.json()`. A bare string payload (e.g. `"head"`) is sent as a JSON string, and Lua receives it as a Lua string.
- The UI never sets focus. Lua calls `SetNuiFocus(true, true)` on open and `SetNuiFocus(false, false)` on exit.

---

## 0. Page and transport basics

| Item | Requirement |
|---|---|
| Entry | `ui_page "web/dist/index.html"`. |
| **Files** | The fxmanifest `files` block lists only `web/dist/index.html` and `web/dist/assets/*.js`. **Anything else (a `.css` file, fonts, images, a subfolder) is not served.** The build must be one `index.html` plus `.js` files directly in `assets/`, with CSS inside the JS. |
| Base path | Relative (`./assets/...`). |
| Resource name | `GetParentResourceName()` = `illenium-appearance` (or whatever the folder is called). |
| Transparency | `html`/`body` transparent, no scrollbars. The ped is the backdrop; Lua points a scripted camera at it. |
| Timeouts | The original retries a callback on a 15 s abort. Not needed for parity. |

## 1. Inbound messages

| `type` | `payload` | Meaning |
|---|---|---|
| `appearance_display` | `{ asynchronous: boolean }` (`Config.AsynchronousLoading`) | Open. Lua has already created the camera at `default`, frozen the ped (`TaskStandStill`) and given NUI focus. The UI now fetches settings and data (§2.1). `asynchronous = true`: fetch settings, *then* data, in sequence. `false`: fire both at once. Either way, render only when everything has arrived. |
| `appearance_hide` | `{}` | Close. Sent by Lua from `exitPlayerCustomization` (after `appearance_save` or `appearance_exit`). Reset all UI state (camera, rotate and clothes toggles, data) so the next open starts clean. |

There are no other inbound messages. Locales and theme are pulled by callbacks.

## 2. Callbacks (UI → Lua)

"Ack" means Lua replies `1` and the UI ignores it.

### 2.1 Bootstrapping

| Name | Request | Response | Notes |
|---|---|---|---|
| `appearance_get_locales` | none (`{}`) | `Locales[convar "illenium-appearance:locale"].UI` (§5) | The original fetches once, on page load. Lua answers even while the menu is closed. |
| `appearance_get_settings` | none | `{ appearanceSettings: AppearanceSettings }` (§3.2) | Ranges for the **current** ped. Fetch on every open: ranges depend on the model. |
| `appearance_get_data` | none | `{ config: ShopConfig, appearanceData: Appearance }` (§3.1, §4) | Lua `Wait(250)`s first, then re-applies the stored tattoos. `appearanceData` is the snapshot taken at open, so keep it as **stored** (the revert target) and copy it as **current** (what the controls edit). |
| `get_theme_configuration` | none | `Config.Theme` = `{ currentTheme: string, themes: Theme[] }` | Colours, radius, font for the original's look. **nuikit doesn't call it**: the server theme comes from `nuikit/theme.css`. |

### 2.2 Live edits

Every edit applies to the ped immediately. Nothing is persisted until `appearance_save`.

| Name | Request | Response | Notes |
|---|---|---|---|
| `appearance_change_model` | model name, a JSON string (`"mp_f_freemode_01"`) | `{ appearanceSettings, appearanceData }` for the new ped | Replace both **settings** and **current**. Keep **stored**. Freemode-ness can change: re-gate the sections (§4.1). The new ped's tattoos are cleared on the Lua side. |
| `appearance_change_head_blend` | the full `HeadBlend` object, with one field changed | ack | Freemode only. |
| `appearance_change_face_feature` | the full `FaceFeatures` object, with one field changed | ack | Freemode only. |
| `appearance_change_head_overlay` | the full `HeadOverlays` map (all 12 entries), with one entry changed | ack | Lua re-applies every overlay. The colour is applied only when the entry has a `color`. |
| `appearance_change_hair` | the full `Hair` object, with one field changed | `HairSettings` for the new style (§3.2) | Replace `settings.hair`. The texture range depends on the style. Lua also re-applies the tattoo set (and the automatic fade). |
| `appearance_change_eye_color` | number `0..30` | ack | |
| `appearance_change_component` | `{ component_id, drawable, texture }` | `ComponentSettings` for that id | Replace that entry in `settings.components`. **When the drawable changes, send `texture: 0`**: the texture range is per drawable. Lua ignores ids 0 and 2 on freemode peds. |
| `appearance_change_prop` | `{ prop_id, drawable, texture }` | `PropSettings` for that id | Same pattern. `drawable: -1` = none (Lua clears the prop). Drawable change → `texture: 0`. |
| `appearance_preview_tattoo` | `{ data: Tattoos, tattoo: Tattoo }` where `tattoo.opacity` is set | ack | Shows `tattoo` on top of the applied set `data`, without applying it. Send when a tattoo is selected and when its opacity changes. |
| `appearance_apply_tattoo` | (a) **shop tattoo**: `{ tattoo: Tattoo, updatedTattoos: Tattoos }`, with `tattoo.opacity` set and `updatedTattoos` = current set plus `tattoo` pushed onto `updatedTattoos[tattoo.zone]` | `boolean`: was it applied | With `Config.ChargePerTattoo`, Lua charges `tattoo.cost ?? Config.TattooCost` cash through a server callback and replies `false` when the player can't pay (the server sends its own ox_lib notify). Update **current** only on `true`. |
| | (b) **hair fade**: the full `Tattoos` map with `ZONE_HAIR = [fade]` | `true` (no `tattoo` key, so no charge) | Lua accepts `data.updatedTattoos or data`. |
| `appearance_delete_tattoo` | the full `Tattoos` map after removal | ack | Remove one: filter `map[zone]` by `name`. Remove all: every zone except `ZONE_HAIR` set to `[]`. |

### 2.3 Camera, ped and clothing preview

| Name | Request | Response | Notes |
|---|---|---|---|
| `appearance_set_camera` | `"default"` / `"head"` / `"body"` / `"bottom"` / `"current"` | ack | Interpolates (1 s). `"current"` re-frames the last chosen camera from the front (used to undo a rotate). Lua ignores calls during an interpolation. |
| `appearance_rotate_camera` | `"left"` / `"right"` | ack | Orbits the current camera to that side. |
| `appearance_turn_around` | none | ack | Ped turns 180° and Lua flips the camera side. |
| `rotate_left` / `rotate_right` | none | ack | Ped turns 10° (left: `+10`, right: `-10`). The original sends these on `keydown` `a` / `d` anywhere on the page. |
| `appearance_remove_clothes` | `"head"` / `"body"` / `"bottom"` | ack | Strips that group to underwear (mask / hat; torso: jacket, undershirt, arms, decals, bag; legs and shoes) with an animation. |
| `appearance_wear_clothes` | `{ data: Appearance, key: "head" \| "body" \| "bottom" }` | ack | Puts that group back from `data` (pass **current**). |

### 2.4 Finish

| Name | Request | Response | Notes |
|---|---|---|---|
| `appearance_save` | the full **current** `Appearance` | ack | Lua re-wears every clothing group, then exits with the appearance: the caller saves it (and charges the shop) and `appearance_hide` follows. Confirm first. |
| `appearance_exit` | none | ack | Lua restores the stored appearance, exits and sends `appearance_hide`. The caller usually shows an ox_lib "cancelled" notify. Only offered when `config.enableExit` is true; the new-character flow sets it false, so a new character can only save. Confirm first. |

## 3. Data model

### 3.1 `Appearance` (current / stored)

```ts
interface Appearance {
  model: string;                    // e.g. "mp_m_freemode_01"
  headBlend: { shapeFirst, shapeSecond, shapeThird, skinFirst, skinSecond, skinThird: number; shapeMix, skinMix, thirdMix: number };
  faceFeatures: Record<FaceFeature, number>;      // -1..1, 1 decimal
  headOverlays: Record<HeadOverlay, { style: number; opacity: number; color: number; secondColor: number }>;
  components: { component_id: number; drawable: number; texture: number }[];  // ids 0..11
  props: { prop_id: number; drawable: number; texture: number }[];            // ids 0,1,2,6,7; drawable -1 = none
  hair: { style: number; color: number; highlight: number; texture: number };
  tattoos: Partial<Record<TattooZone, Tattoo[]>>;  // can be {} or have zones missing
  eyeColor: number;                                // 0..30
}
```

- Overlay `style` is 0 and `opacity` is 0 when the overlay is off. Opacity is rounded to 1 decimal.
- `FaceFeature` (in native order): `noseWidth, nosePeakHigh, nosePeakSize, noseBoneHigh, nosePeakLowering, noseBoneTwist, eyeBrownHigh, eyeBrownForward, cheeksBoneHigh, cheeksBoneWidth, cheeksWidth, eyesOpening, lipsThickness, jawBoneWidth, jawBoneBackSize, chinBoneLowering, chinBoneLenght, chinBoneSize, chinHole, neckThickness` (the spellings are the wire keys).
- `HeadOverlay` (native index order): `blemishes, beard, eyebrows, ageing, makeUp, blush, complexion, sunDamage, lipstick, moleAndFreckles, chestHair, bodyBlemishes`.
- Arrays may arrive as JSON objects if Lua tables have holes. Look entries up by `component_id` / `prop_id`, never by position.

### 3.2 `AppearanceSettings`

```ts
type Range = { min: number; max: number };
type FloatRange = { min: number; max: number; factor: number };      // factor = step
type Blacklist = { drawables: number[]; textures: number[] };
type RGB = [number, number, number];

interface AppearanceSettings {
  ped: { model: { items: string[] } };                               // models this player may use
  components: { component_id: number; drawable: Range; texture: Range; blacklist: Blacklist }[];
  props:      { prop_id: number;      drawable: Range; texture: Range; blacklist: Blacklist }[];
  headBlend: { shapeFirst, shapeSecond, shapeThird, skinFirst, skinSecond, skinThird: Range /*0..45*/;
               shapeMix, skinMix, thirdMix: FloatRange /*0..1 step 0.1*/ };
  faceFeatures: Record<FaceFeature, FloatRange>;                     // -1..1 step 0.1
  headOverlays: Record<HeadOverlay, { style: Range; opacity: FloatRange /*0..1 step .1*/; color?: { items: RGB[] } }>;
  hair: { style: Range; texture: Range; color: { items: RGB[] }; highlight: { items: RGB[] }; blacklist: Blacklist };
  eyeColor: Range;                                                   // 0..30
  tattoos: { items: Record<TattooZone, Tattoo[]>; opacity: FloatRange /*0.1..1 step 0.1*/ };
}
interface Tattoo { name: string; label: string; hashMale: string; hashFemale: string; zone: TattooZone; collection: string; cost?: number; opacity?: number }
type TattooZone = "ZONE_TORSO" | "ZONE_HEAD" | "ZONE_LEFT_ARM" | "ZONE_RIGHT_ARM" | "ZONE_LEFT_LEG" | "ZONE_RIGHT_LEG" | "ZONE_HAIR";
```

- **Colour palettes come from the payload.** `hair.color.items` / `hair.highlight.items` are the game's hair colours (`GetPedHairRgbColor`, 64 on current builds). `headOverlays.{beard,eyebrows,chestHair}.color.items` is the same hair palette. `headOverlays.{makeUp,blush,lipstick}.color.items` is the makeup palette (`GetPedMakeupRgbColor`). The colour *index* (0-based position in `items`) is what goes on the wire. No constant table is needed.
- Overlays without `color` (blemishes, ageing, complexion, sunDamage, moleAndFreckles, bodyBlemishes) have no colour control.
- Ranges can be empty: a component with one drawable has `drawable.max = 0`, a drawable without texture variants has `texture.max = 0`, and `max` can be `-1` when the ped has none. Prop `drawable.min` and `texture.min` are `-1`.
- **Blacklist**: `blacklist.drawables` / `blacklist.textures` are values the player may not pick (job/gang/ace/citizenid-locked clothing, `shared/blacklist.lua`). `textures` applies to the *current* drawable. Steppers skip blacklisted values and wrap from max to min. Freemode peds only.
- Tattoos are filtered by gender in Lua (`hash<Gender> ~= ""`). Filter again in the UI after a model change (male freemode: `hashMale !== ""`, otherwise `hashFemale !== ""`).
- `tattoos.items.ZONE_HAIR` is the list of hair **fades** (decorations). It is shown as a "fade" stepper in the hair section, not as a tattoo zone.

### 3.3 Eye colour names

Lua sends only the range. The 31 indices have well-known game names (Green, Emerald, Light Blue, Ocean Blue, Light Brown, Dark Brown, Hazel, Dark Gray, Light Gray, Pink, Yellow, Purple, Blackout, Shades of Gray, Tequila Sunrise, Atomic, Warp, ECola, Space Ranger, Ying Yang, Bullseye, Lizard, Dragon, Extra Terrestrial, Goat, Smiley, Possessed, Demon, Infected, Alien, Undead). The UI can show them as a hint; there is no locale key for them.

## 4. Config flags (`ShopConfig`, from `appearance_get_data`)

```ts
interface ShopConfig {
  ped: boolean; headBlend: boolean; faceFeatures: boolean; headOverlays: boolean;
  components: boolean; props: boolean; tattoos: boolean;
  componentConfig: { masks, upperBody, lowerBody, bags, shoes, scarfAndChains, bodyArmor, shirts, decals, jackets: boolean };
  propConfig: { hats, glasses, ear, watches, bracelets: boolean };
  enableExit: boolean;        // false for new characters
  hasTracker: boolean;        // Config.PreventTrackerRemoval && player has an ankle tracker
  automaticFade: boolean;     // Config.AutomaticFade
}
```

Which sections each flow enables (set in Lua, the UI just obeys the flags):

| Flow | Sections |
|---|---|
| New character | `Config.NewCharacterSections` (default: all), `enableExit = false` |
| Clothing shop | components, props |
| Ped menu (admin) | ped, headBlend, faceFeatures, headOverlays, components, props, tattoos |
| Barber | headOverlays |
| Tattoo shop | tattoos |
| Surgeon | headBlend, faceFeatures |

### 4.1 Gating rules

- `isFreemode = current.model === "mp_m_freemode_01" || current.model === "mp_f_freemode_01"`.
- Ped section: `config.ped`.
- Heritage: `config.headBlend && isFreemode`. Face features: `config.faceFeatures && isFreemode`.
- Head overlays section: `config.headOverlays`. Inside it, hair style and texture always show. Hair colour, highlight and fade, eyebrows, eye colour and every other overlay show only when `isFreemode`. Fade shows only when `!config.automaticFade`.
- Clothes: `config.components`. Component groups, in display order, each gated by `componentConfig`: **Head** (id 0, only when *not* freemode, not gated), mask 1 (`masks`), scarf & chains 7 (`scarfAndChains && !hasTracker`), jackets 11, shirt 8 (`shirts`), body armour 9, bags 5, arms 3 (`upperBody`), legs 4 (`lowerBody`), shoes 6, decals 10. Id 2 (hair) is edited in the hair section.
- Props: `config.props`. Hats 0, glasses 1, ear 2, watches 6, bracelets 7, each gated by `propConfig`.
- Tattoos: `config.tattoos && isFreemode`. One group per zone in `settings.tattoos.items` except `ZONE_HAIR`.

## 5. Locale keys (`appearance_get_locales` response)

The response is the `UI` table of the selected locale. All strings, all optional in practice (fall back to built-in English).

```
modal.save.title / modal.save.description
modal.exit.title / modal.exit.description
modal.accept / modal.decline
ped.title / ped.model
headBlend.title
headBlend.shape.{title, firstOption, secondOption, mix}
headBlend.skin.{title, firstOption, secondOption, mix}
headBlend.race.{title, shape, skin, mix}
faceFeatures.title
faceFeatures.nose.{title, width, height, size, boneHeight, boneTwist, peakHeight}
faceFeatures.eyebrows.{title, height, depth}
faceFeatures.cheeks.{title, boneHeight, boneWidth, width}
faceFeatures.eyesAndMouth.{title, eyesOpening, lipsThickness}
faceFeatures.jaw.{title, width, size}
faceFeatures.chin.{title, lowering, length, size, hole}
faceFeatures.neck.{title, thickness}
headOverlays.title
headOverlays.hair.{title, style, color, highlight, texture, fade}
headOverlays.{opacity, style, color, secondColor, eyeColor}
headOverlays.{blemishes, beard, eyebrows, ageing, makeUp, blush, complexion, sunDamage, lipstick, moleAndFreckles, chestHair, bodyBlemishes}
components.{title, drawable, texture, head, mask, upperBody, lowerBody, bags, shoes, scarfAndChains, shirt, bodyArmor, decals, jackets}
props.{title, drawable, texture, hats, glasses, ear, watches, bracelets}
tattoos.{title, apply, delete, deleteAll, opacity}
tattoos.items.{ZONE_TORSO, ZONE_HEAD, ZONE_LEFT_ARM, ZONE_RIGHT_ARM, ZONE_LEFT_LEG, ZONE_RIGHT_LEG}
```

Face feature → locale key: `noseWidth→nose.width, nosePeakHigh→nose.height, nosePeakSize→nose.size, noseBoneHigh→nose.boneHeight, nosePeakLowering→nose.peakHeight, noseBoneTwist→nose.boneTwist, eyeBrownHigh→eyebrows.height, eyeBrownForward→eyebrows.depth, cheeksBoneHigh→cheeks.boneHeight, cheeksBoneWidth→cheeks.boneWidth, cheeksWidth→cheeks.width, eyesOpening→eyesAndMouth.eyesOpening, lipsThickness→eyesAndMouth.lipsThickness, jawBoneWidth→jaw.width, jawBoneBackSize→jaw.size, chinBoneLowering→chin.lowering, chinBoneLenght→chin.length, chinBoneSize→chin.size, chinHole→chin.hole, neckThickness→neck.thickness`.

There are no locale keys for the camera, rotate and clothing buttons, or for a panel title.

## 6. Camera and rotate controls (UI state machine)

- **Camera** `{ head, body, bottom }`, at most one true. Click X: if X is active → all false, send `appearance_set_camera "default"`. Otherwise → only X true, send `appearance_set_camera X`. Either way, reset rotate to `{ left: false, right: false }`.
- **Rotate** `{ left, right }`, at most one true. Click left: if left is active → off, send `appearance_set_camera "current"`. Otherwise → `{ left: true, right: false }`, send `appearance_rotate_camera "left"`. Same for right.
- **Turn around**: send `appearance_turn_around` (no state).
- **Clothes** `{ head, body, bottom }`, independent toggles, true = removed. Toggle X: if X was removed → send `appearance_wear_clothes { data: current, key: X }`. Otherwise → send `appearance_remove_clothes X`. Flip X.
- **Keys**: `a` → `rotate_left`, `d` → `rotate_right` (10° ped turn).

## 7. Quirks

1. `{type, payload}` envelope, not `{action, data}`.
2. Only `index.html` and `assets/*.js` are served (§0). Inline the CSS into the JS. No fonts or images. The old `index.b8e72b46.js` can stay next to the new one; `index.html` decides which runs.
3. `appearance_get_data` sleeps 250 ms in Lua. Show a loading state rather than nothing if it matters.
4. Settings are per ped: refetch on every open, and replace them after a model change. Component, prop and hair responses replace one entry.
5. Drawable change ⇒ texture 0, in the payload *and* in current state.
6. Head blend, face features and overlays send the **whole** object each time, not a delta.
7. Opacity and mix values are floats with step 0.1. Lua converts with `+ 0.0`, so integers are fine on the wire.
8. Lua's `json.encode` turns empty tables into `[]`. `tattoos` can arrive as `[]` instead of `{}`; normalise it to an object before indexing by zone.
9. Tattoo previews aren't undone by Lua when you select another tattoo: each preview redraws the applied set plus the new one, so the last preview stays until the next change.
10. Apply charges money per tattoo when enabled. Never re-send `appearance_apply_tattoo` automatically.
11. The new-character flow has no exit (`enableExit = false`). The only way out is save.
12. Escape does nothing in the original. Lua doesn't listen for it.
13. Lua sets the camera before `appearance_display`, so the UI should open with no camera button active.

## 8. Implementation checklist

- [ ] Listen for `appearance_display` / `appearance_hide` in `{type, payload}` form.
- [ ] Locales: fetch once, deep-merge over English fallbacks.
- [ ] On display: settings + data (sequential when `asynchronous`), keep stored + current. Reset everything on hide.
- [ ] Section gating per §4.1, re-evaluated on model change.
- [ ] Ped: searchable model list plus prev/next → `appearance_change_model`, replace settings + current.
- [ ] Heritage: 6 index steppers (0..45) + 3 mix sliders → full `headBlend`.
- [ ] Face: 20 sliders −1..1 grouped by the locale groups → full `faceFeatures`.
- [ ] Hair: style/texture steppers (blacklist-aware) → `appearance_change_hair`, replace `settings.hair`. Colour and highlight swatches from the payload palette. Fade stepper (`ZONE_HAIR`) → `appearance_apply_tattoo` with the full map.
- [ ] Overlays: per overlay opacity slider, style stepper, colour swatches (where `color` exists), makeup second colour → full `headOverlays`.
- [ ] Eye colour stepper → `appearance_change_eye_color`.
- [ ] Components and props: drawable/texture steppers, blacklist skip + wrap, drawable change → texture 0, replace settings entry from the response.
- [ ] Tattoos: per zone list, select → preview, opacity → preview, apply (handle `false`) / remove / remove all.
- [ ] Camera, rotate, turn, clothes toggles per §6; `a`/`d` keys (not while typing).
- [ ] Save and exit confirmations with the `modal.*` strings. Exit hidden when `!enableExit`.
- [ ] Build: single `index.html` + `assets/*.js`, CSS inlined, transparent body.
