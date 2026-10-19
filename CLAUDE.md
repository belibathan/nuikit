# nuikit: guide for coding agents

nuikit is one design system for a whole FiveM server: stock shadcn/ui React UIs that render correctly
in FiveM's NUI (Chromium 103) and are themed by one server-wide TweakCN theme. Read this before changing
anything, then read `docs/design.md`.

Current release: **0.4.0** (npm `nuikit-core`, `vite-plugin-nuikit`, `create-nuikit`; GitHub release
`v0.4.0` with `nuikit.zip`). Direction: `docs/vision.md` (read first), then `docs/architecture.md`. Active work: `docs/next/blocks.md`.

## Map

| Path | What |
|---|---|
| `packages/vite` | `vite-plugin-nuikit`: lowers Tailwind v4/shadcn CSS to Chromium 103 (oklch → rgb, color-mix → rgba channels, media ranges, transforms), in-game HMR, `nuikit-doctor`. |
| `packages/core` | `nuikit-core`: `fetchNui`/`onNui`, surfaces (focus, layers, Escape across resources), `compileTheme`/`applyTheme`, prefs, the versioned handshake, player bridge types, devtools, host (`/host`, `/module`, `/boot`). `lua/nuikit.lua` + `lua/bridge.lua` + `lua/host.lua` are the Lua halves. `tokens/` is the published DTCG file and schema. |
| `packages/cli` | `nuikit` CLI: `nuikit check` (conformance audit against `docs/protocol.md`), `nuikit tokens`. |
| `packages/create-nuikit` | `npm create nuikit`. `index.css.tpl` is the **single source** of every UI's `index.css` (theme + kit utilities). |
| `registry/nuikit/{ui,hooks}` + `registry.json` | shadcn registry items (`npx shadcn add https://nuikit.vercel.app/r/<name>.json`). Compositions of stock shadcn. |
| `vendor/shadcn/ui` | Unmodified shadcn new-york-v4 components (only the `cn` import path changed). Never edit; re-copy from upstream. |
| `systems/<name>` | `[nuikit]` resources (fxmanifest, Lua, `web/`). Reference UI: `systems/nuikit_pause`. |
| `addons/<name>` | Overrides: new web UIs for other resources (ox_lib, ox_inventory…), built into that resource's UI folder. Clean-room from `docs/<name>-protocol.md`. |
| `apps/www` | The site + registry host (Vercel, deploys from `main`). |
| `scripts/` | `sync-template.mjs` (`pnpm sync`), `pack-systems.mjs` (`pnpm pack:systems` → `out/nuikit.zip`), `new-system.mjs` (scaffold). |
| `bench/host` | Host benchmark (iframes vs one frame) and the host's end-to-end check. Results in `results.md`. |
| `docs/` | `vision.md` (direction), `architecture.md` (the 0.6 plan: intents, adapters, renderers), `protocol.md` (the standard, v1), `tokens.md` (tokens v1, theme pipeline, prefs), `host.md` (host prototype), `design.md` (kit language), `coverage.md`, protocol specs, `releases/`. |

## Commands

```bash
pnpm install
pnpm -r --filter "./packages/**" build   # core + vite must be built before any web app builds
pnpm sync                                 # copy sources into every system/addon/template (see below)
pnpm typecheck && pnpm test               # vitest; Lua runs under Lua 5.4 (wasmoon) in packages/core/test/lua
pnpm build:systems && pnpm pack:systems   # every web UI, then out/nuikit.zip + per-override zips
pnpm --filter <web-package> dev           # browser dev with devtools (press `); fixtures live in src/dev.tsx
```

## How sources flow (`pnpm sync`)

Each `systems/*` and `addons/*` has a `nuikit.json`:
`{ "lua": ["nuikit.lua","bridge.lua"], "components": ["button","card"], "hooks": [], "target": {"resource","path"} }`.
`pnpm sync` copies the listed Lua from `packages/core/lua`, components from `vendor/shadcn/ui` or
`registry/nuikit/ui`, and writes `web/src/index.css` from `index.css.tpl`. **Synced copies are committed
but never edited by hand**: change the source, run `pnpm sync`. Feature CSS goes in a separate file
(`app.css`, `pause.css`) imported after `index.css`.

New system or override: `node scripts/new-system.mjs systems/nuikit_x "Title"` or
`node scripts/new-system.mjs addons/<resource> "Title" --resource <resource> --path <ui folder>`.

## Hard rules

- **Chromium 103** (until Chromium 144, on canary since Oct 2026, reaches the release channel; see `docs/vision.md`). No `color-mix()`/`oklch` in inline styles (the plugin only lowers stylesheets). Nothing
  essential on `:has()` or `@container` (ignored; the build warns). No individual `scale`/`translate`
  properties in custom CSS; animations that use `transform` break centred dialogs. Test at 1920×1080,
  2560×1440 and 1280×720.
- **Design.** Follow `docs/design.md`: kit utilities (`nk-*`), the spacing/type scale, rem not px, sentence
  case, one primary per surface, colours only from theme tokens (`docs/tokens.md`; darken the game with
  `--scrim`). Never redefine an `nk-*` name locally. `nuikit check` must stay at level 3 for every page (CI).
- **Dev servers** rewrite `ui_page` to localhost while running: stop them with Ctrl+C / SIGINT, never SIGKILL,
  or the fxmanifest is left pointing at the dev server.
- **Overrides are clean-room.** Read the upstream resource to write `docs/<name>-protocol.md`, then implement
  from the spec. Never copy upstream code, markup or styles (licences: LGPL/GPL). Every POST payload and
  timing must match the spec; verify with Playwright by logging POSTs. Output file names must match the
  resource's fxmanifest `ui_page`/`files`. Add `<meta name="nuikit-handshake" content="off">` to the page.
- **Presentation only.** nuikit doesn't own gameplay (only exception: `nuikit_stress`). Read framework data
  through `bridge.lua`; never call focus natives from a UI (surfaces / the owning resource do).
- **Nothing ships untested in game.** Browser checks first, then the owner tests on a Qbox server via a
  prerelease (push to `next/<name>` → npm `next` + GitHub prerelease `next-<sha>` with the zips).
- **Credit** is `@belibathan` only (GitHub avatar + handle). Never a real name in UI, docs, badges or credits.
- **Secrets.** The npm token lives only in the `NPM_TOKEN` GitHub secret. Never print or commit tokens or
  passwords.

## Verifying UI work

Run the web app's dev server and drive it with Playwright (Chromium is at `/opt/pw-browsers/chromium` in
Claude cloud sessions; locally use any Chromium). Fire messages with `window.postMessage({ action, data })`
(some overrides use other envelopes; see their protocol doc), screenshot every state, and log every POST.
Look at the screenshots. A change isn't done until it looks right at all three resolutions.

## Releasing

1. Changesets: add `.changeset/<name>.md` for user-facing package changes.
2. Merge to `main`. The version PR can't be opened by Actions in this repo, so run `pnpm changeset version`
   locally on `main`, bump `version` in every `systems/*/fxmanifest.lua`, write `docs/releases/v<version>.md`,
   commit "chore: release <version>", push.
3. The Release workflow publishes npm and creates GitHub release `v<version>` with `out/*.zip`.
