# Make your resource nuikit-native

For resource authors and sellers: how an existing resource reads the server's theme, joins the protocol,
passes `nuikit check`, and keeps working on a server that doesn't run nuikit. Everything here is the short
form of [`docs/protocol.md`](protocol.md) and [`docs/tokens.md`](tokens.md); those win where they differ.

## 1. Read the theme tokens

The server's theme is one file, `theme.css` in the `nuikit` resource. The `nuikit` resource compiles it at
start and on `nuikit theme reload` and publishes the result as `GlobalState.nuikitTheme`
(`{ version: 1, mode, hash, vars, imports }`). Your page never reads `theme.css` directly on the live path: it
receives the compiled theme as the `nuikit:theme` message (on `nuikit:ready`, and again when the theme changes)
and applies `vars` to `document.documentElement`. `nuikit-core` does this for you (`applyTheme`).

What you consume in CSS is the token set, as custom properties:

- The shadcn base tokens: `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`,
  `--muted`, `--accent`, `--destructive` (each with `-foreground` where shadcn has one), `--border`, `--input`,
  `--ring`, `--chart-1`…`--chart-5`, `--radius`, `--font-sans`, `--font-mono`, the `--sidebar-*` set.
- nuikit's additions: `--success`, `--warning`, `--info` (each with `-foreground`), `--hud`, `--hud-foreground`,
  `--vital-health`, `--vital-armor`, `--vital-hunger`, `--vital-thirst`, `--vital-stress`, `--nk-scale`,
  `--nk-motion`.
- Every colour also comes as `--<name>-rgb` / `--<name>-a` channels, which is how `bg-primary/50` compiles for
  FiveM's Chromium 103.

Use `var(--primary)` or a utility that resolves to it (`bg-primary`). Fixed colours are allowed only for what a
theme cannot know (GTA palettes, item images); mark them with a `nuikit-ignore` comment and a reason.

Machine-readable: `packages/core/tokens/nuikit.tokens.json` (the default theme as a W3C DTCG file) and
`packages/core/tokens/nuikit-theme.schema.json` (the JSON Schema of a compiled theme). Both ship in the npm
package as `nuikit-core/tokens.json` and `nuikit-core/theme.schema.json`. `nuikit tokens` prints the list.

A page MUST render correctly with its compiled-in defaults when no theme arrives (protocol §6).

## 2. Declare the protocol and your level

A resource whose page speaks the protocol declares the version in `fxmanifest.lua`, and the conformance level
`nuikit check` gave it so the doctor can show it:

```lua
ui_page 'web/dist/index.html'
nuikit_protocol '1'
nuikit_level '3'
```

- `nuikit_protocol` is the highest protocol version you speak, as a string of digits. Tools read it with
  `GetResourceMetadata(resource, 'nuikit_protocol', 0)`; a missing entry means "not a protocol participant"
  (your page may still be a themed page, Level 1).
- `nuikit_level` is `'1'`, `'2'` or `'3'`: the level `nuikit check` reports for you (next section). `nuikit
  doctor` lists it per resource and asks you to declare it when it's missing.
- An override (a page that replaces another resource's UI and speaks that resource's own wire format, with
  `<meta name="nuikit-handshake" content="off">`) MUST NOT declare `nuikit_protocol`: the Lua it runs against is
  not nuikit's.

## 3. What `nuikit check` levels mean

Three cumulative levels (protocol §10). `nuikit check <resource>` prints the highest one you reach and every
finding that keeps you from the next.

| Level | Name | You |
|---|---|---|
| 1 | Themed | Read the tokens (at least one `var(--…)` / `bg-primary` / `nk-*` reference) and hard-code no colour a token covers: no hex, `rgb()`, `hsl()`, `oklch()` literals, no Tailwind palette classes (`bg-emerald-500`). Token definitions and black/white shadows are fine; anything else needs `nuikit-ignore` with a reason. |
| 2 | Well-behaved | Level 1, and: declare `nuikit_protocol` when you have a `ui_page`; register your UI as surfaces (`NUI.surface` or simple mode); never call `SetNuiFocus` / `SetNuiFocusKeepInput` yourself; release focus when you stop (automatic with `nuikit.lua`, else an `onClientResourceStop` handler); handle Escape through surfaces, not your own keydown listener. |
| 3 | Native | Level 2, and: run on the nuikit runtime (`nuikit.lua` as a client script, `nuikit-core` in the page) and build on the kit's components (stock shadcn/ui and the nuikit registry), following `docs/design.md`. |

Not level-gating but reported: remote fonts and assets (ship them in the resource), NUI messages from a
`Wait(0)` loop (send on change, or batch at ≤ 10 Hz), and the Chromium 103 rules (`cef/*`: raw
`backdrop-filter`, `:has()`, `@container`, the individual `scale` / `translate` / `rotate` properties,
`color-mix()` / `oklch()` in inline styles).

**In your listing.** State the level you declare: *built on nuikit, level 3*. The level is what a buyer can
verify with `nuikit check` on the unpacked resource; "themed by the server" is Level 1, "focus and Escape never
fight the HUD" is Level 2, "the kit's components, repainted live by `nuikit theme reload`" is Level 3.

## 4. Running without nuikit

The default is to import the runtime from the `nuikit` resource, like ox_lib:

```lua
dependency 'nuikit'
shared_script '@nuikit/init.lua'
```

A resource that must run on a server without nuikit vendors the Lua instead. In the monorepo this is the
`"lua"` key of a system's `nuikit.json` (`{ "lua": ["nuikit.lua", "bridge.lua"], … }`): `pnpm sync` copies those
files from `packages/core/lua` into the resource's `client/`. Outside the monorepo, copy nuikit's
`lib/nuikit.lua` into `client/` and list it in `client_scripts` in place of the `@nuikit/init.lua` import (the
template's fxmanifest says the same in a comment). Either way the copy is never edited by hand; update it by
copying again.

With the Lua vendored, the page and your script keep working when the `nuikit` resource is absent:

- `NUI.theme()` returns `nil` when `GetResourceState('nuikit') ~= 'started'`; no `nuikit:theme` arrives and the
  page keeps its built-in defaults (`index.css` carries the stock theme), which Level 1 already requires.
- Player preferences fall back to a local KVP store instead of the server's.
- Surfaces, focus, Escape and messaging keep working inside your resource; coordination with other resources'
  surfaces (protocol §3) only involves the ones that also run `nuikit.lua`, imported or vendored.

Don't guard on nuikit yourself beyond what the vendored Lua does; a page that assumes a theme message will
arrive fails Level 1 either way.

## 5. Checklist

1. Colours from tokens only; `nuikit-ignore` with a reason on the rest.
2. `nuikit_protocol '1'` in fxmanifest (not for overrides).
3. Surfaces for every screen; no `SetNuiFocus`, no own Escape listener.
4. `nuikit-core` in the page, `@nuikit/init.lua` (or the vendored `nuikit.lua`) in Lua, kit components.
5. `nuikit check ./my-resource`, then `nuikit_level '<1-3>'` with what it printed.
6. Listing: "built on nuikit, level N".
