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
- **Small PRs, many of them.** One item per PR; open it and start the next item. A broken `main` is fixed by the
  next PR, not prevented by a slower one.
- **Say what's unproven in one line** (usually "not seen in game") and move on.

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
| Lead | the session on the owner's PC | Direction, the lane list, reviews and merges every PR, deploys to the owner's server, the in-game loop |
| Lane sessions | one per lane (below), each in its own worktree | Execute their list, open PRs, never merge |
| Thinkers | subagents a lane spawns (`Plan`, `architect`, `Explore`) | Design or research one question, return a short answer; never edit |
| Executors | subagents a lane spawns for independent pieces | Implement one piece in the lane's files |

The lane session is the integrator of its own subagents. Thinkers are for real unknowns only (a native's behaviour, an
API shape); a spike beats a study.

## Every lane

1. `CLAUDE.md`, then only the docs your item needs.
2. Branch from `main` (or your previous unmerged PR's branch, said in the PR body). PR into `main`. Never push to
   `main` or `next/*`; never merge, release or publish. Never touch the FiveM server.
3. Stay in your files (table). A change elsewhere goes under "Requests" in your PR body; small, obviously safe edits
   to shared files (a token, a kit utility) are fine when the item can't ship without them: say so in the PR.
4. Gate: `pnpm typecheck`, the build of what you touched, `pnpm sync` clean, `nuikit check` (CI), tests where there's
   logic, a POST-log diff for an override's main flow. Changeset for user-facing package changes.
5. PR body: what changed (bullets), what needs an in-game check (3 lines max), Requests.
6. Update only your lane's rows in `docs/roadmap.md`. Credit `@belibathan` only. Never print or commit secrets.
7. Done or blocked: end your turn with PR links, the in-game checks, what's blocked. The lead picks it up.

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
