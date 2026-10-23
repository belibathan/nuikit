# nuikit: guide for coding agents

**What nuikit is:** the shared layer between scripts and screens on any FiveM server. One runtime
coordinates what every UI shares (focus, Escape, camera, controls, theme, player context); scripts ask for
intents (notify, menu, input…) and swappable, themed renderers draw them; adapters bring ox, QBCore and ESX
scripts in without rewrites; bespoke screens join through the protocol. The kit (stock shadcn/ui, one
TweakCN theme) is the default look and the showcase, not the product. Design: `docs/architecture.md`.

**Start here (Oct 23, 2026):** [`docs/roadmap.md`](docs/roadmap.md) is the one tracker (the 0.9 plan: finish the foundations, the adoption surface, the rails); [`docs/next/handoff.md`](docs/next/handoff.md) is the dated state snapshot (philosophy, open bugs, owner screenshots); [`docs/design/baseline.md`](docs/design/baseline.md) has the rules every component follows; [`docs/README.md`](docs/README.md) says what every other doc is and whether it's current.

**How we work (Oct 22, 2026: fast, many agents, one direction):**
- **Nobody runs this in production yet. Ship, break, fix.** Many agents moving the same way beat one agent
  deliberating. A wrong default costs one commit to change; a stalled agent costs the day.
- **Don't ask, decide by the design rule:** everything hierarchical (identity → tokens → component → resource
  config → player prefs), the best option as the default, the alternative behind a config key, token or prop.
  Never hard-code what a server might want different. The owner is asked only about money, accounts, publishing,
  secrets or a real server. Log new calls in one row of `docs/next/decisions.md`.
- **Spend few tokens:** read only what your item touches (grep, then line ranges), no screenshot sweeps, matrices,
  long reports, before/after sheets or speculative refactors.
- **No PRs until servers run nuikit.** Lanes commit small to their own branch and push it; the lead merges into
  `main` locally and pushes. CI runs on `main` after the fact; red means the next commit fixes it.
- **The quick gate (about a minute):** `pnpm typecheck`, the build of what you touched, `pnpm sync` clean. Tests
  where there is real logic. A POST-log diff only when an override changes what it POSTs (its protocol must not
  break). Nothing else gates shipping.
- A spike only for a genuine unknown (a native's behaviour, a process model), then build.
- One line on what's unproven ("not seen in game"), and move on. The owner tests in game at checkpoints.
- Premium means subtle: motion, rows not cards, sheets, text that rolls, cameras that don't spin (`docs/design.md`).

Roles, lanes and file ownership: `docs/next/dispatch.md`. Read this, then only what your item needs.

Current release: **0.8.0** (npm `nuikit-core`, `vite-plugin-nuikit`, `create-nuikit`; GitHub release
`v0.8.0` with `nuikit.zip` and the per-framework zips); `main` is ahead of it (tokens 1.7, Default, Neon Pop, the baseline).
Direction: `docs/vision.md`, then `docs/architecture.md`. Parallel agents: `docs/next/dispatch.md` (lanes, file ownership, rules).

## Map

| Path | What |
|---|---|
| `packages/vite` | `vite-plugin-nuikit`: lowers Tailwind v4/shadcn CSS to Chromium 103 (oklch → rgb, color-mix → rgba channels, media ranges, transforms), in-game HMR, `nuikit-doctor`. |
| `packages/core` | `nuikit-core`: `fetchNui`/`onNui`, surfaces (focus, layers, Escape across resources), `compileTheme`/`applyTheme`, prefs, the versioned handshake, player bridge types, devtools, host (`/host`, `/module`, `/boot`). `lua/nuikit.lua` + `bridge.lua` + `host.lua` + `camera.lua` + `controls.lua` are the Lua halves; `lua/init.lua` is the import (`shared_script '@nuikit/init.lua'`), synced with them into the `nuikit` resource's `init.lua` + `lib/`. `tokens/` is the published DTCG file and schema. |
| `packages/cli` | `nuikit` CLI: `nuikit check` (conformance audit against `docs/protocol.md`), `nuikit tokens`. |
| `packages/create-nuikit` | `npm create nuikit`. `index.css.tpl` (theme, tokens, NUI scale) and `kit.css` (the `nk-*` utilities) are the **single sources** of every UI's `index.css`; the site imports `kit.css` directly. |
| `registry/nuikit/{ui,hooks}` + `registry.json` | shadcn registry items (`npx shadcn add https://nuikit.vercel.app/r/<name>.json`). Compositions of stock shadcn. |
| `vendor/shadcn/{ui,hooks}` | Every shadcn new-york-v4 component and its `use-mobile` hook, unmodified (only the `cn` / sibling import paths changed). The foundation every page composes from (`docs/design.md` rule 10); `pnpm sync` follows their imports. Never edit; re-copy from upstream (`scripts/vendor-shadcn.mjs`). |
| `systems/<name>` | `[nuikit]` resources (fxmanifest, Lua, `web/`). Reference UI: `systems/nuikit_pause`. |
| `addons/<name>` | Overrides: new web UIs for other resources (ox_lib, ox_inventory…), built into that resource's UI folder. Clean-room from `docs/<name>-protocol.md`. |
| `apps/www` | The site + registry host (Vercel, deploys from `main`). |
| `scripts/` | `sync-template.mjs` (`pnpm sync`), `pack-systems.mjs` (`pnpm pack:systems` → `out/nuikit.zip`), `new-system.mjs` (scaffold), `vendor-shadcn.mjs`, `kit-merge.mjs`, `prune-branches.mjs` (delete fully-merged branches), `server/setup-windows.ps1`. |
| `bench/host` | Host benchmark (iframes vs one frame) and the host's end-to-end check. Results in `results.md`. |
| `docs/` | `README.md` is the index (current / reference / historical). `roadmap.md` (the one tracker), `next/` (dispatch, decisions, handoff), `vision.md`, `architecture.md`, `protocol.md` (v1), `tokens.md` (1.7), `design/` (`baseline.md`, `components.md`, `default.md`, `naming.md`), `coverage.md`, `doctor.md`, the `*-protocol.md` specs, `releases/`, `archive/` (superseded). |

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
   locally on `main`, bump `version` in every `systems/*/fxmanifest.lua` **and `adapters/*/*/fxmanifest.lua`**, write `docs/releases/v<version>.md`,
   commit "chore: release <version>", push.
3. The Release workflow publishes npm and creates GitHub release `v<version>` with `out/*.zip`.
