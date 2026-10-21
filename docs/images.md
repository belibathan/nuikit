# Images by convention

nuikit is glue: a UI shouldn't need its own copy of every item, clothing or vehicle picture when the
server already has them. `nuikit-core` resolves an image from the conventions popular resources already
use, and a server can point it at anything else with one convar.

```ts
import { resolveImage, loadImageConfig } from "nuikit-core";

await loadImageConfig(); // once per page: the server's templates (no-op in the browser)
resolveImage("item", "water");            // ["nui://ox_inventory/web/images/water.png", "nui://qb-inventory/html/images/water.png", …]
resolveImage("weapon", "WEAPON_PISTOL");  // weapons are items
resolveImage("vehicle", "sultan");        // ["https://docs.fivem.net/vehicles/sultan.webp"]
resolveImage("clothing", { model: "mp_m_freemode_01", type: "component", id: 11, drawable: 5, texture: 0 });
```

It returns candidate URLs, best first. In React use the registry component **`nui-image`**:
`<NuiImage kind="item" imageKey="water" />` tries each URL in turn (lazy, an `onError` chain), never shows a
broken-image icon, and falls back to an icon (or your `fallback`) when none load.

## What works out of the box

| Kind | Default sources, in order |
|---|---|
| `item` | `nui://ox_inventory/web/images/{name}.png` (and ox_inventory's own `inventory:imagepath` convar when set), `nui://qb-inventory/html/images/{name}.png`, `nui://ps-inventory/html/images/{name}.png`, `nui://lj-inventory/html/images/{name}.png` |
| `weapon` | the item sources (`WEAPON_PISTOL.png` …), after any weapon-specific templates |
| `vehicle` | `https://docs.fivem.net/vehicles/{model}.webp` (the FiveM docs' images; base-game spawn names) |
| `clothing` | none: packs differ, so the server names one (below). Without one, UIs keep their plain controls. |

A `nui://<resource>/…` URL only loads when that resource lists the file in its fxmanifest `files`.

## Pointing at your own images

Set these in `server.cfg` (or `nuikit/nuikit.cfg`) and `restart nuikit`. Each is a `;`-separated list of
URL templates, tried **before** the defaults (`setr nuikit_images_replace 1` drops the defaults).

```cfg
setr nuikit_images_item     "https://cdn.example.com/items/{name}.webp"
setr nuikit_images_weapon   ""
setr nuikit_images_vehicle  "nui://my_vehicle_images/images/{model}.webp"
setr nuikit_images_clothing "https://cdn.example.com/clothing/{gender}_{prefix}{id}_{drawable}_{texture}.webp"
```

The nuikit resource serves them to every page through the NUI callback `https://nuikit/images`.

> **Not landed yet:** the nuikit resource's `images` and `vehicle` callbacks (and these convars) ship in a
> separate lane. Until then pages use the defaults above (items and weapons work, no clothing thumbnails,
> no car picture in qbx_vehiclesales) and fall back silently.

| Placeholder | Kinds | Value |
|---|---|---|
| `{name}` / `{lower}` | item, weapon | the item name / lower case |
| `{model}` | vehicle | spawn name, lower case |
| `{model}` | clothing | `mp_m_freemode_01` / `mp_f_freemode_01` |
| `{gender}` / `{g}` | clothing | `male`/`female` · `m`/`f` |
| `{type}` / `{kind}` / `{prefix}` | clothing | `component`/`prop` · `D`/`P` · `""`/`prop_` |
| `{id}` / `{drawable}` / `{texture}` | clothing | component or prop id (0–11 / 0–7), drawable, texture |
| `{collection}` | clothing | `base` (base-game items) |

### Clothing packs

- **fivem-greenscreener** (the common generator): writes `images/clothing/{gender}_{prop_?}{id}_{drawable}_{texture}.png`
  into its own resource folder. Serve that folder (add it to a resource's `files`), then
  `setr nuikit_images_clothing "nui://<resource>/images/clothing/{gender}_{prefix}{id}_{drawable}_{texture}.png"`.
- **Colbss/FiveM-ClothingData** (public, nothing to host): base-game renders on GitHub,
  `https://raw.githubusercontent.com/Colbss/FiveM-ClothingData/refs/heads/master/images/{model}/{collection}/{kind}_{id}_{drawable}_{texture}.webp`.
  Checked to load (components and props, both models). The repository states no licence and GitHub's raw
  host rate-limits; fine to try, host your own copy for production. Add-on clothing has no picture there and
  falls back.

## Where it's used

- **illenium-appearance:** with a clothing template, each clothing and accessory group shows a grid of
  drawable thumbnails and one of texture thumbnails under its steppers; the chosen one is ringed. Picking a
  tile sends exactly what the stepper would.
- **qbx_vehiclesales:** a picture of the car in the contract. qbx_vehiclesales doesn't send the model, so the
  page asks the nuikit resource (`https://nuikit/vehicle`: the vehicle you sit in or stand at, read only).
- **HUD weapon readout:** `resolveImage("weapon", name)` / `<NuiImage kind="weapon">` gives the inventory's own
  weapon picture.
