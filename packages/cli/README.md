# nuikit

The command line for the [nuikit protocol](https://github.com/belibathan/nuikit/blob/main/docs/protocol.md),
the UI platform layer for FiveM.

```bash
npx nuikit check ./my_resource          # grade one resource
npx nuikit check ./resources --level 2  # every resource under a folder; exit 1 if any is below level 2
npx nuikit tokens                       # the theme tokens a UI should read
```

## `nuikit check [path]`

Audits a FiveM resource folder (fxmanifest.lua or `__resource.lua`, client Lua, web sources and/or built files)
and reports the conformance level it reaches, with `file:line:column` for everything that keeps it from the next.
A folder that isn't a resource is searched for resources (four levels deep). It reads files with a tokenizer, not
a compiler, so it takes milliseconds and needs nothing installed.

| Level | Name | Means |
|---|---|---|
| 1 | themed | Reads the server's theme tokens and hard-codes no colour a token covers |
| 2 | well-behaved | Declares `nuikit_protocol`, registers surfaces, never calls `SetNuiFocus` itself, releases focus on stop, handles Escape through surfaces |
| 3 | native | Runs on the nuikit runtime (`nuikit.lua` + `nuikit-core`) and builds on shadcn/ui components |

| Rule | Level | Finds |
|---|---|---|
| `color/hardcoded` | 1 | Hex, `rgb()`, `hsl()`, `oklch()`, `lab()`… literals and named colours in CSS, markup and script strings. Token definitions in `:root`/`.dark`/`@theme`, `var(--token, fallback)` fallbacks, black/white shadows and masks are allowed. |
| `color/palette-class` | 1 | Tailwind palette classes (`bg-emerald-500`, `hover:text-red-400/80`), in class strings and `@apply` |
| `tokens/none` | 1 | A UI that never reads a token (`var(--primary)`, `bg-primary`, `nk-*`) |
| `manifest/protocol` | 2 | `ui_page` without `nuikit_protocol '1'` |
| `surfaces/none` | 2 | A `ui_page` with no `NUI.surface` / `NUI.open` |
| `focus/direct` | 2 | `SetNuiFocus` / `SetNuiFocusKeepInput` outside `nuikit.lua` |
| `focus/no-release` | 2 | Direct focus with no `onClientResourceStop` handler that releases it |
| `escape/adhoc` | 2 | A keydown/keyup Escape check that posts a close callback itself (advisory for overrides, whose protocol dictates it) |
| `native/runtime` | 3 | `nuikit.lua` not loaded, or the page doesn't import `nuikit-core` |
| `native/components` | 3 | No `components/ui/*` (shadcn / nuikit registry) |
| `perf/remote-asset` | advisory | Fonts, styles and media fetched from the network (`@import url(https://…)`, `<link href>`, `src`) |
| `perf/frame-send` | advisory | `SendNUIMessage` / `NUI.send` inside a loop that waits `Wait(0)` |

Comments are never scanned. Silence a deliberate exception (GTA's own palettes, item art) with a reason:

```css
/* nuikit-ignore color/hardcoded: GTA hair palette, the theme can't know it */
background: #1c1f21;
```

`nuikit-ignore [rules]` works on the same line or alone on the line above; `nuikit-ignore-next-line [rules]` on the
line above. Without rule ids it silences every rule on that line.

Options: `--level <1|2|3>` (exit 1 below it), `--json`, `--verbose` (every finding, not five per rule),
`--include-built` (also grade `dist/` and `build/` when sources exist; with no sources, built HTML and CSS are graded
automatically). Exit codes: 0 pass, 1 below `--level`, 2 bad arguments or no resource found.

Findings in a `src/index.css` synced from the kit's template are marked as inherited and collapsed into one line,
because they're fixed once in `packages/create-nuikit/index.css.tpl`.

## `nuikit tokens`

Prints tokens v1 (`docs/tokens.md`): the shadcn base tokens plus `success`, `warning`, `info`, `hud`,
`vital-*`, `nk-scale` and `nk-motion`. `--json` for tooling, `--css` for a plain list of custom properties.

## API

```ts
import { check, checkResource } from "nuikit";
const [result] = check("./my_resource"); // { level, findings: [{ rule, level, severity, file, line, column, message }], … }
```

MIT · [@belibathan](https://github.com/belibathan)
