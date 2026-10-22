# Dispatch: many agents, one direction

*How the agents work on nuikit at once. Status: [`../roadmap.md`](../roadmap.md). Direction: [`../vision.md`](../vision.md).*

## The stance (Oct 22, 2026)

Nobody runs nuikit in production yet. **Speed beats polish.** Ship, break, fix. Many small agents moving the same
direction produce the right whole; one agent deliberating produces nothing. When unsure, pick the option that keeps
things **configurable** (see "The design rule") and move on. A wrong default costs one commit to change.

- **Act, don't ask.** No owner questions for design calls: apply the design rule, ship the default, make it a setting.
  Ask the owner only for money, accounts, publishing, secrets, or anything that touches a real server.
- **Spend few tokens.** Read only the files your task touches; don't re-read the whole docs set per task. No
  screenshot sweeps, matrices, long reports or speculative refactors. Grep before reading; read ranges, not files.
- **Small commits, no PRs.** One item per commit (or a few); push your branch and start the next item. The lead
  merges branches into `main` locally. A broken `main` is fixed by the next commit, not prevented by a slower flow.
  (PRs, required CI and reviews come back once real servers run nuikit.)
- **Say what's unproven in one line** (usually "not seen in game") and move on.

## Order of work (the owner, Oct 22)

1. **The product, in game, as good as it can be.** Only work that makes the screens on a real server better.
2. Then conventions, performance, code hierarchy.
3. Then presentation: the site, the registry pages, `npm create` blocks, the GitHub README.

Until step 1 is done, don't spend tokens on 2 or 3: no site or theme-studio work, no blocks, no docs beyond one line
a feature needs.

## The design rule (settles design questions)

nuikit is a universal, open-source framework: great conventions, shortcuts and presets on top of a system where
**everything can be configured and connected**. So every design question resolves the same way:

1. **Hierarchical:** identity → semantic tokens → component tokens → per-resource config → per-player prefs. A
   value is set at the highest level that makes sense, and every lower level can override it.
2. **Default + switch:** ship the best default (the recommended option), and put the alternative behind a config
   key, a token or a prop. Never hard-code a choice a server might want different.
3. **Conventions over options in the common path:** zero config gives the premium look; config is for the 20%.

## Roles

| Role | Who | Does |
|---|---|---|
| Lead | the session on the owner's PC | Direction, the lane list, merges lane branches into `main` locally (quick gate, push), keeps the roadmap, deploys to the owner's server, the in-game loop |
| Lane sessions | one per lane (below), each in its own worktree | Execute their list on their own branch, push it, tell the lead; never touch `main` |
| Thinkers | subagents a lane spawns (`Plan`, `architect`, `Explore`) | Design or research one question, return a short answer; never edit |
| Executors | subagents a lane spawns for independent pieces | Implement one piece in the lane's files |

The lane session is the integrator of its own subagents. Thinkers are for real unknowns only (a native's behaviour, an
API shape); a spike beats a study.

## Every lane

1. `CLAUDE.md`, then only the docs your item needs.
2. Work on your lane branch (`lane-<x>`); `git pull --rebase origin main` before you start an item. Commit small,
   push your branch. Never push to `main` or `next/*`; never merge, release or publish. Never touch the FiveM server.
3. Stay in your files (table). Small, obviously safe edits to shared files (a token, a kit utility) are fine when the
   item can't ship without them: say so in the commit message.
4. Quick gate before each push (about a minute): `pnpm typecheck` and the build of what you touched, `pnpm sync`
   clean. Tests only where there's real logic. For an **override that changes what it POSTs** to its resource, also a
   POST-log diff of its main flow (`bench/screens/run.mjs` + `diff.mjs`): that's the one change that breaks servers.
   Full CI runs on `main` after the merge; if it goes red, the next commit fixes it.
5. Don't edit `docs/roadmap.md` (the lead keeps it, per batch). Changeset for user-facing package changes. Credit
   `@belibathan` only. Never print or commit secrets.
6. Done or blocked: end your turn with your branch, what's in it (bullets), what needs an in-game check (3 lines),
   what's blocked. The lead merges it.

## Lanes and files

| Lane | Owns |
|---|---|
| Lead / A (in-game) | merges, the owner's server, `docs/releases/*-test.md`, this file, `CLAUDE.md` |
| B HUD | `systems/nuikit_hud`, the minimap part of `systems/nuikit/client.lua` |
| C Platform + docs | `packages/core`, `packages/cli`, `packages/vite`, `systems/nuikit` (rest), `scripts/`, `bench/`, `docs/` (architecture, protocol, tokens, host, roadmap rewrite), `packages/create-nuikit/kit.css` + `index.css.tpl` |
| D Screens + overrides | `systems/nuikit_death`, `nuikit_loading`, `nuikit_chat`, `addons/*` except `ox_inventory` |
| E Kit + site | `registry/**`, `registry.json`, `packages/create-nuikit` (except kit.css/index.css.tpl), `apps/www` |
| F Showcase | `systems/nuikit_pause`, `systems/nuikit_stress`, `addons/ox_inventory` |

Append-only and shared: `registry.json` entries, `.changeset/*.md` (one file per PR). Synced copies (`web/src/index.css`,
`web/src/components/ui/*`, `lib/`, `client/*.lua` copies) are never edited by hand: change the source, `pnpm sync`.

## Hard rules that stay (they protect players and licences)

- Overrides are **clean-room** and **protocol-exact**: implement from `docs/<name>-protocol.md`, never copy upstream
  code, markup or styles; POST payloads and timings match.
- Chromium 103 rules in `CLAUDE.md`. Presentation only (no gameplay).
- **Server-authoritative templates** (any block or template with server Lua is copied into real servers): never trust
  the page (look up prices, amounts, targets, item names on the server); validate types and ranges; check identity,
  permission, presence and distance on the server; move money and items atomically with rollback; rate-limit per
  player; never send licenses or identifiers to the page; Lua tests for each rule including failure paths.
