# vite-plugin-nuikit

**Make shadcn/ui and Tailwind v4 render in FiveM.** FiveM's NUI is Chromium 103, and Tailwind v4 targets 111+. This Vite plugin lowers your CSS at build time, keeps themes live, and gives you in-game hot reload.

```bash
npm i -D vite-plugin-nuikit
```

```ts
// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import { nuikit } from "vite-plugin-nuikit";

export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit()], // after tailwindcss()
});
```

## What it fixes

| Tailwind v4 / shadcn output | Chromium 103 | After |
|---|---|---|
| `oklch()` / `lab()` theme colors | ignored | hex, with wide-gamut `@supports` fallbacks kept |
| `color-mix(in oklab, var(--primary) 50%, transparent)` (`bg-primary/50`) | ignored | `rgba(var(--primary-rgb), calc(var(--primary-a) * .5))`, live with theme changes |
| `@media (width >= 48rem)` | ignored | `@media (min-width: 48rem)` |
| `translate:` / `scale:` / `rotate:` | ignored | one `transform`, composed via non-inheriting `@property` |
| `linear-gradient(to right in oklab, …)` | ignored | `linear-gradient(to right, …)` |
| CSS nesting, `dvh` | ignored | flattened, `vh` |
| `:has()`, `@container`, `light-dark()`, `@starting-style` | ignored | **reported** at build so nothing fails silently |

Verified by rendering in a real Chromium 103 in CI: see [`examples/cef-proof`](../../examples/cef-proof).

## Options

```ts
nuikit({
  manifest: "../fxmanifest.lua", // where ui_page lives
  page: "web/dist/index.html",   // ui_page value for builds
  hotInGame: true,               // point ui_page at the dev server during `vite dev`
  compat: true,                  // or a Chromium major (e.g. 120) when Cfx updates CEF; false to disable
  report: true,                  // print the compat summary
});
```

It also sets `base: "./"` (NUI loads from `nui://`) and `build.target: "chrome103"`.

## Runtime themes

Opacity modifiers read `--x-rgb` / `--x-a` channels. To change a theme at runtime, use `applyTheme()` from `nuikit-core`. It sets both.

## nuikit-doctor

Audit or fix any built NUI, even one not built with this plugin:

```bash
npx nuikit-doctor web/dist
npx nuikit-doctor web/dist --fix
```

## Programmatic

```ts
import { lowerCss, formatReport } from "vite-plugin-nuikit";
const { code, report } = lowerCss(css, { chrome: 103 });
```

MIT · part of [nuikit](https://github.com/belibathan/nuikit)
