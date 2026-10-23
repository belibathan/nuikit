<a href="https://nuikit.vercel.app"><img src="https://raw.githubusercontent.com/belibathan/nuikit/main/docs/assets/banner.png" alt="nuikit, the design system for FiveM NUI" width="100%" /></a>

# nuikit-core

[![npm](https://img.shields.io/npm/v/nuikit-core?style=flat-square&labelColor=0a0a0a&color=262626)](https://www.npmjs.com/package/nuikit-core)
[![CI](https://img.shields.io/github/actions/workflow/status/belibathan/nuikit/ci.yml?branch=main&label=CI&style=flat-square&labelColor=0a0a0a&color=262626)](https://github.com/belibathan/nuikit/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-262626?style=flat-square&labelColor=0a0a0a)](https://github.com/belibathan/nuikit/blob/main/LICENSE)

Part of **[nuikit](https://github.com/belibathan/nuikit)**: shadcn/ui and Tailwind v4 for FiveM NUI, rendered right. [Website & live demo →](https://nuikit.vercel.app)

Typed, framework-agnostic NUI runtime for FiveM, plus the Lua half (`lua/nuikit.lua`).

```bash
npm i nuikit-core
```

## Types, once

```ts
// nui.d.ts
declare module "nuikit-core" {
  interface NuiEvents {    // Lua → UI  (NUI.send)
    "hud:vitals": { health: number; armor: number };
  }
  interface NuiCallbacks { // UI → Lua  (fetchNui ↔ NUI.on)
    "shop:buy": { req: { id: string }; res: { ok: boolean } };
  }
}
```

## Vanilla

```ts
import { fetchNui, onNui, closeNui, isBrowser, mockNui } from "nuikit-core";

onNui("hud:vitals", (v) => render(v));
const { ok } = await fetchNui("shop:buy", { id: "zentorno" });
mockNui("shop:buy", ({ id }) => ({ ok: id !== "sold-out" })); // browser only
```

## React

```tsx
import { useNuiEvent, useNuiState, useNuiVisibility, useNuiCallback } from "nuikit-core/react";

const vitals = useNuiState("hud:vitals", { health: 100, armor: 0 });
const { visible, close } = useNuiVisibility(); // NUI.open/close + Escape
const buy = useNuiCallback("shop:buy");       // { call, loading, error, data }
```

## Surfaces

Declare each piece of UI in Lua; nuikit decides focus, cursor, stacking and Escape across every resource that uses it.

```lua
local inv = NUI.surface('inventory', { layer = 'panel', exclusive = true, hides = { 'hud' } })
inv:open({ items = GetItems() })
NUI.state('dead', true) -- surfaces with blockedBy = { 'dead' } refuse to open
```

```tsx
import { Surface, useSurface } from "nuikit-core/react";

<Surface name="inventory" layer="panel" hides={["hud"]}>
  {(data) => <InventoryGrid items={data.items} />}
</Surface>;

const inv = useSurface("inventory"); // { open, visible, focused, data, close }
```

Layers stack `hud` < `world` < `panel` < `modal` < `system`. Focus goes to the top surface that takes input; Escape closes top-down. Type surface data with `interface NuiSurfaces` next to your events.

## Live values

A value that moves every frame (a compass, a speedometer) streams from Lua at ≤30 messages a second, only when it changed, and the page glides between them at the game's frame rate without rendering ([protocol §5.7](../../docs/protocol.md#57-live-values)).

```lua
local rpm = NUI.stream('hud:rpm', { rate = 30, precision = 0.01 }) -- kind = 'angle' for headings
rpm:push(GetVehicleCurrentRpm(vehicle)) -- from any loop; it decides when to send
```

```tsx
import { useFollow } from "nuikit-core/react"; // or follow() from "nuikit-core", without React

const bar = useRef<HTMLDivElement>(null);
useFollow("hud:rpm", (v) => { bar.current!.style.transform = `scaleX(${v})`; }, { start: 0 });
```

In FiveM `requestAnimationFrame` runs at the game's frame rate (140–300/s): never send a message or a callback per frame.

## Devtools

```tsx
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";

const mocks = defineMocks({
  events: { "hud:vitals": [{ health: 100, armor: 50 }, { health: 12, armor: 0 }] },
  callbacks: { "shop:buy": () => ({ ok: true }) },
});

<NuiDevtools {...mocks} />; // press ` · renders nothing in game
```

## Runtime theming

```ts
import { applyTheme } from "nuikit-core";
applyTheme(pastedTweakcnCss); // sets vars + Chromium 103 rgb channels
```

## Lua

Copy `lua/nuikit.lua` into your resource (`create-nuikit` does it for you) and list it in `client_scripts` before your own files.

```lua
NUI.send('hud:vitals', { health = 80 })
NUI.on('shop:buy', function(data) return { ok = true } end)
local menu = NUI.surface('menu', { layer = 'panel' })
menu:open(data) menu:close()
NUI.state('dead', true)
NUI.open({ cursor = true, keepInput = false }) -- single-UI mode
NUI.close()
NUI.notify({ title = 'Paid', type = 'success' })
NUI.stream('hud:rpm', { rate = 30 }):push(0.62) -- a live value (see above)
```

Set `setr nuikit_debug 1` to log traffic.

---

<sub>MIT · Built by <a href="https://github.com/belibathan">@belibathan</a> · <a href="https://github.com/belibathan/nuikit">github.com/belibathan/nuikit</a></sub>
