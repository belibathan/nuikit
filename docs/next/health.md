# Code health pass (Oct 22, 2026, branch `auto/health`)

Scope: `packages/cli`, `packages/vite`, `scripts/`, `bench/`, `.github/workflows/`, root config. Not touched:
`packages/core/src/tokens.ts`, `kit.css`, `systems/nuikit_hud/**`, `systems/nuikit/theme*`.

## Gate

`pnpm install --frozen-lockfile`, package builds, `pnpm sync` (clean), `pnpm typecheck`, `pnpm test`
(core 634 incl. Lua under wasmoon, create-nuikit 831, cli 45, vite 11, www 191) and both `nuikit check`
runs from CI: all green after the fixes below. Before them, `main` was red in CI (the www theme studio test).

## Fixed

- **CI red on main**: `apps/www` theme studio's `exportThemeCss` didn't round-trip Ink. It dropped every
  derived token (Ink sets its own `--nk-ease-expand` / `--nk-ease-breathe`, re-derived to stock curves) and
  wrote the tile treatment's `var(--font-display)` defaults, which recompiling resolved to literals (and,
  after today's accent-gradient commit, `var(--nk-accent-gradient)`, which it warned about). The export now
  recompiles itself and keeps or omits exactly those tokens.
- **Release fails on every push** (15 of the last 15): `changesets/action` tries to open the version PR,
  which Actions may not do here, and force-pushes `changeset-release/main`. Fix written but **not pushed**:
  the git credential lacks the `workflow` scope, so GitHub refuses any `.github/workflows` change. It is
  commit "ci(release): pending changesets are a notice" on the local branch `auto/health-workflow`
  (in `C:\dev\nuikit`): the `changesets/action` step becomes an `echo "::notice …"` and
  `pull-requests: write` goes. Owner: `gh auth refresh -s workflow`, then push or cherry-pick it.
- `nuikit --version` printed `0.6.0` (hard-coded); now read from package.json. `--level=3` (with `=`) was
  silently level 0; now parsed. An exception inside `check()` exits 2 with a message, not a stack.
- `nuikit-doctor`: a file `lowerCss` throws on is reported and the run continues (exit 1).
- `vite-plugin-nuikit` dev: `ui_page` is also restored on process `exit` (crash) and `SIGHUP` (terminal
  window closed), not only SIGINT/SIGTERM/server close.
- Removed the unused `browserslist` dependency of `vite-plugin-nuikit`.
- `engines: node >=18` on `vite-plugin-nuikit` and `create-nuikit` (both ship bins, tsup targets node18).
  The vite one landed in the browserslist commit.
- Untracked `.omc/` (oh-my-claudecode session state, committed by accident) and ignored it.
- Removed `scripts/cleanup-070.sh`: a 0.7.0 one-shot against `lead/next`, referenced nowhere.

## Suggestions (not done), by priority

1. **Test the dev manifest rewrite** (`packages/vite/src/plugin.ts` `writeUiPage` + restore). It edits a
   user's `fxmanifest.lua`; only `compat.ts` has tests. A temp-dir test: serve → localhost, close → page.
2. **Signal handlers pile up** on every Vite server restart (`process.once` per `configureServer`); register
   once per process (module-level flag) to avoid MaxListeners warnings in long dev sessions.
3. **Release workflow**: after the fix above, it still installs and builds when changesets are pending;
   move the `pending` count before install and skip both.
4. **`pack-systems.mjs` and `new-system.mjs` have no tests**; `sync-template.mjs` pruning (it deletes files
   listed in `sync-manifest.json`) is only covered indirectly by `core/test/scaffold.test.ts`.
5. **`packages/cli` is `private: true`** yet carries `files`, `exports` and `bin` for publishing, and the
   docs mention `npx nuikit check`. Decide: publish it with the other three, or drop the publish fields.
6. `create-nuikit` lists `nuikit-core` as a devDependency it never imports; it only orders `pnpm -r build`
   (sync needs core's Lua). Keep it, but a comment in package.json can't exist, so note it in CONTRIBUTING.
7. `nuikit check` passes but reports 345 (level-3 set) and 510 (systems) warnings, mostly `type/raw`
   literals; a burn-down per lane would make new warnings visible.
8. CLAUDE.md's `scripts/` row omits `kit-merge.mjs`, `vendor-shadcn.mjs` and `server/setup-windows.ps1`.
