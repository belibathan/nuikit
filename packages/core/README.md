# nuikit

Typed, framework-agnostic NUI runtime for FiveM, plus the Lua half (`lua/nuikit.lua`).

```bash
npm i nuikit
```

## Types, once

```ts
// nui.d.ts
declare module "nuikit" {
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
import { fetchNui, onNui, closeNui, isBrowser, mockNui } from "nuikit";

onNui("hud:vitals", (v) => render(v));
const { ok } = await fetchNui("shop:buy", { id: "zentorno" });
mockNui("shop:buy", ({ id }) => ({ ok: id !== "sold-out" })); // browser only
```

## React

```tsx
import { useNuiEvent, useNuiState, useNuiVisibility, useNuiCallback } from "nuikit/react";

const vitals = useNuiState("hud:vitals", { health: 100, armor: 0 });
const { visible, close } = useNuiVisibility(); // NUI.open/close + Escape
const buy = useNuiCallback("shop:buy");       // { call, loading, error, data }
```

## Devtools

```tsx
import { NuiDevtools, defineMocks } from "nuikit/devtools";

const mocks = defineMocks({
  events: { "hud:vitals": [{ health: 100, armor: 50 }, { health: 12, armor: 0 }] },
  callbacks: { "shop:buy": () => ({ ok: true }) },
});

<NuiDevtools {...mocks} />; // press ` · renders nothing in game
```

## Runtime theming

```ts
import { applyTheme } from "nuikit";
applyTheme(pastedTweakcnCss); // sets vars + Chromium 103 rgb channels
```

## Lua

Copy `lua/nuikit.lua` into your resource (`create-nuikit` does it for you) and list it in `client_scripts` before your own files.

```lua
NUI.send('hud:vitals', { health = 80 })
NUI.on('shop:buy', function(data) return { ok = true } end)
NUI.open({ cursor = true, keepInput = false })
NUI.close()
NUI.notify({ title = 'Paid', type = 'success' })
```

Set `setr nuikit_debug 1` to log traffic.

MIT · part of [nuikit](https://github.com/belibathan/nuikit)
