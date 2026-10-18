<a href="https://nuikit.vercel.app"><img src="https://raw.githubusercontent.com/belibathan/nuikit/main/docs/assets/banner.png" alt="nuikit — shadcn/ui + Tailwind v4 for FiveM" width="100%" /></a>

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
NUI.open({ cursor = true, keepInput = false })
NUI.close()
NUI.notify({ title = 'Paid', type = 'success' })
```

Set `setr nuikit_debug 1` to log traffic.

---

<sub>MIT · Built by <a href="https://github.com/belibathan">@belibathan</a> · <a href="https://github.com/belibathan/nuikit">github.com/belibathan/nuikit</a></sub>
