# nuikit: guide for coding agents

**What nuikit is:** the shared layer between scripts and screens on any FiveM server. One runtime
coordinates what every UI shares (focus, Escape, camera, controls, theme, player context); scripts ask for
intents (notify, menu, input…) and swappable, themed renderers draw them; adapters bring ox, QBCore and ESX
scripts in without rewrites; bespoke screens join through the protocol. The kit (stock shadcn/ui, one
TweakCN theme) is the default look and the showcase, not the product. Design: `docs/architecture.md`.

**How we work (Oct 21, 2026: speed first):**
- Every step ships something useful on its own. Small commits, so a cut-off loses little.
- **Ship, then iterate.** The owner judges in game and spots defects faster than any review. No screenshot
  sweeps, no identity × resolution matrices, no before/after sheets, no visual "proof" passes. Don't ask
  permission for anything a backup covers.
- **The only gate:** `pnpm typecheck`, the build, `pnpm sync` clean, and a POST-log diff for an override's
  main flow (its protocol must not break). Tests where there is real logic. Nothing else gates shipping.
- Test a mechanism before building on it only when it's genuinely unknown (a native's behaviour, a
  process model); then one quick spike, not a study.
- Be honest about what's unproven, in one line, and move on.
- Premium means subtle: motion, rows not cards, sheets, text that rolls, cameras that don't spin. See
  `docs/design.md` and `docs/releases/v0.7.0-handoff.md` §2–§4.

Read this before changing anything, then `docs/design.md`.

Current release: **0.7.0** (npm `nuikit-core`, `vite-plugin-nuikit`, `create-nuikit`; GitHub release
`v0.7.0` with `nuikit.zip` and the per-framework zips). Direction: `docs/vision.md` (read first), then `docs/architecture.md`.
**Status and what's next: `docs/roadmap.md`** (update your rows in every PR). Parallel agents: `docs/next/dispatch.md`
(lanes, file ownership, rules).

## Map

| Path | What |
|---|---|
| `packages/vite` | `vite-plugin-nuikit`: lowers Tailwind v4/shadcn CSS to Chromium 103 (oklch → rgb, color-mix → rgba channels, media ranges, transforms), in-game HMR, `nuikit-doctor`. |
| `packages/core` | `nuikit-core`: `fetchNui`/`onNui`, surfaces (focus, layers, Escape across resources), `compileTheme`/`applyTheme`, prefs, the versioned handshake, player bridge types, devtools, host (`/host`, `/module`, `/boot`). `lua/nuikit.lua` + `bridge.lua` + `host.lua` + `camera.lua` + `controls.lua` are the Lua halves; `lua/init.lua` is the import (`shared_script '@nuikit/init.lua'`), synced with them into the `nuikit` resource's `init.lua` + `lib/`. `tokens/` is the published DTCG file and schema. |
| `packages/cli` | `nuikit` CLI: `nuikit check` (conformance audit against `docs/protocol.md`), `nuikit tokens`. |
| `packages/create-nuikit` | `npm create nuikit`. `index.css.tpl` (theme, tokens, NUI scale) and `kit.css` (the `nk-*` utilities) are the **single sources** of every UI's `index.css`; the site imports `kit.css` directly. |
| `registry/nuikit/{ui,hooks}` + `registry.json` | shadcn registry items (`npx shadcn add https://nuikit.vercel.app/r/<name>.json`). Compositions of stock shadcn. |
| `vendor/shadcn/ui` | Unmodified shadcn new-york-v4 components (only the `cn` import path changed). Never edit; re-copy from upstream. |
| `systems/<name>` | `[nuikit]` resources (fxmanifest, Lua, `web/`). Reference UI: `systems/nuikit_pause`. |
| `addons/<name>` | Overrides: new web UIs for other resources (ox_lib, ox_inventory…), built into that resource's UI folder. Clean-room from `docs/<name>-protocol.md`. |
| `apps/www` | The site + registry host (Vercel, deploys from `main`). |
| `scripts/` | `sync-template.mjs` (`pnpm sync`), `pack-systems.mjs` (`pnpm pack:systems` → `out/nuikit.zip`), `new-system.mjs` (scaffold). |
| `bench/host` | Host benchmark (iframes vs one frame) and the host's end-to-end check. Results in `results.md`. |
| `docs/` | `roadmap.md` (status, the one tracker), `next/dispatch.md` (agent lanes), `vision.md` (direction), `architecture.md` (the target design: runtime, intents, adapters, renderers, services, doctor; the 0.7 plan), `protocol.md` (the standard, v1), `tokens.md` (tokens v1, theme pipeline, prefs), `host.md` (host prototype), `design.md` (kit language), `coverage.md`, protocol specs, `releases/`. |

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
Systems and the template import the Lua runtime (`dependency 'nuikit'`, `shared_script '@nuikit/init.lua'`);
`"lua"` vendors files into `client/` only for resources that must run without nuikit, and `"runtime": true`
(the `nuikit` resource) receives `init.lua` + `lib/`. `pnpm sync` copies the listed Lua from `packages/core/lua`, components from `vendor/shadcn/ui` or
`registry/nuikit/ui`, and writes `web/src/index.css` from `index.css.tpl` + `kit.css`. **Synced copies are committed
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
- **The owner tests in game, after the merge.** Everything lands on `main` fast; releases are cut often;
  in-game findings come back as the next commits. (`next/<name>` still builds a prerelease when wanted.)
- **Credit** is `@belibathan` only (GitHub avatar + handle). Never a real name in UI, docs, badges or credits.
- **Secrets.** The npm token lives only in the `NPM_TOKEN` GitHub secret. Never print or commit tokens or
  passwords.

## Verifying UI work

Typecheck, build, sync. For an override, replay its main flow once with Playwright and diff the POST log
(`bench/screens/run.mjs` / `diff.mjs`); the protocol must not change. One screenshot of the main state is
fine when you need to see something; never a sweep. The owner tests in game and reports; fix fast.

## Releasing

1. Changesets: add `.changeset/<name>.md` for user-facing package changes.
2. Merge to `main`. The version PR can't be opened by Actions in this repo, so run `pnpm changeset version`
   locally on `main`, bump `version` in every `systems/*/fxmanifest.lua`, write `docs/releases/v<version>.md`,
   commit "chore: release <version>", push.
3. The Release workflow publishes npm and creates GitHub release `v<version>` with `out/*.zip`.
