# Dispatch: many agents, one direction

*How the agents work on nuikit at once. What to work on: [`../roadmap.md`](../roadmap.md). Design calls: [`decisions.md`](decisions.md).
Rules every component follows: [`../design/baseline.md`](../design/baseline.md).*

## The stance (Oct 22, 2026; unchanged Oct 23)

Nobody runs nuikit in production yet. **Speed beats polish.** Ship, break, fix. Many small agents moving the same direction
produce the right whole; one agent deliberating produces nothing. When unsure, pick the option that keeps things
**configurable** (the design rule) and move on. A wrong default costs one commit to change.

- **Act, don't ask.** No owner questions for design calls. Ask the owner only for money, accounts, publishing, secrets, or
  anything that touches a real server.
- **Spend few tokens.** Read `CLAUDE.md`, then only the files your item touches. Grep before reading; read ranges. No
  screenshot sweeps, matrices, long reports or speculative refactors.
- **Small commits, no PRs.** One item per commit. Push your branch; the lead merges into `main` locally and pushes. A broken
  `main` is fixed by the next commit. (PRs, required CI and reviews come back once real servers run nuikit.)
- **Say what's unproven in one line** ("not seen in game") and move on. The owner tests in game at checkpoints.

## Two ways of working

**Cloud lanes** (this is most work): a lane session takes a roadmap item, works in its own worktree on `lane-<x>/<item>`,
runs the gate, pushes, and ends its turn with: the branch, what's in it, what needs an in-game check (3 lines), what's blocked.
The lead merges.

**The owner's local session** (`C:\dev\nuikit`, junctioned into his Qbox server): works live in game, hot-reloading a system
(`pnpm --filter ./systems/<x>/web dev`) or deploying an addon (`pnpm build`, `.local\deploy.ps1`), and commits its own
batches straight to `main` when the owner says it's right. Practical notes (what not to restart, the private theme.css,
worktrees): [`handoff.md`](handoff.md) §6. The two modes don't conflict: cloud lanes rebase on `main` before each item.

## The design rule (settles design questions)

nuikit is a universal, open-source framework: great conventions and presets on top of a system where everything can be
configured and connected. Every design question resolves the same way:

1. **Hierarchical:** identity → semantic tokens → component tokens → per-resource config → per-player prefs. Set a value at
   the highest level that makes sense; every lower level can override it.
2. **Default + switch:** ship the best default, put the alternative behind a config key, a token or a prop. Never hard-code
   a choice a server might want different.
3. **Conventions over options in the common path:** zero config gives the premium look; config is for the 20%.
4. **One concept, one component.** Every visual idea has exactly one implementation in `registry/nuikit/ui`; screens compose
   and never restyle internals. A new need is a prop or a lever on the foundation, not CSS on the screen.

Log a new call in one row of [`decisions.md`](decisions.md).

## Lanes for 0.9 and the files they own

| Lane | Track | Owns |
|---|---|---|
| Lead | all | merges, the roadmap, releases, `CLAUDE.md`, this file |
| Kit | A | `registry/**`, `registry.json`, `packages/create-nuikit` (except `kit.css` / `index.css.tpl`) |
| Screens | A (migration), B1 | `systems/nuikit_{hud,pause,death,loading,chat,voice}`, `addons/*` |
| Platform | B1, B3, C | `packages/{core,cli,vite}`, `systems/nuikit`, `scripts/`, `bench/`, `install/`, `docs/`, `kit.css` + `index.css.tpl` |
| Site | B2, B4 | `apps/www` |
| Figma | B4 | the Figma file and `docs/design/figma.md`, `bench/figma` |

Append-only and shared: `registry.json` entries, `.changeset/*.md`. Synced copies (`web/src/index.css`, `web/src/components/ui/*`,
`lib/`, `client/*.lua` copies) are never edited by hand: change the source, `pnpm sync`. A small, obviously safe edit to a
shared file (a token, a kit utility) is fine when the item can't ship without it: say so in the commit.

## The gate (about a minute, before each push)

`pnpm typecheck`, the build of what you touched, `pnpm sync` clean. Tests where there is real logic. For an override that
changes what it POSTs to its resource, a POST-log diff of its main flow (`bench/screens/run.mjs` + `diff.mjs`): that is the
one change that breaks servers. Full CI runs on `main` after the merge; red means the next commit fixes it.

## Hard rules that stay (they protect players and licences)

- Overrides are **clean-room** and **protocol-exact**: implement from `docs/<name>-protocol.md`, never copy upstream code,
  markup or styles; POST payloads and timings match.
- Chromium 103 rules in `CLAUDE.md`. Presentation only (no gameplay).
- **Server-authoritative templates** (any block or template with server Lua is copied into real servers): never trust the
  page; validate types and ranges; check identity, permission, presence and distance on the server; move money and items
  atomically with rollback; rate-limit per player; never send identifiers to the page; Lua tests for each rule.
- Credit `@belibathan` only. Never print or commit secrets.
