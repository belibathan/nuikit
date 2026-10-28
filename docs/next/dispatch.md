# Dispatch: many agents, one direction

*How the agents work on nuikit at once. What to work on: [`../roadmap.md`](../roadmap.md). Design calls: [`decisions.md`](decisions.md).
The design rules: [`../design.md`](../design.md).*

## The stance (Oct 22, 2026; unchanged Oct 23)

Nobody runs nuikit in production yet. **Speed beats polish.** Ship, break, fix. Many small agents moving the same direction
produce the right whole; one agent deliberating produces nothing. When unsure, pick the option that keeps things
**configurable** (the design rule) and move on. A wrong default costs one commit to change.

- **Act, don't ask.** No owner questions for design calls. Ask the owner only for money, accounts, publishing, secrets, or
  anything that touches a real server.
- **Spend few tokens.** Read `CLAUDE.md`, then only the files your item touches. Grep before reading; read ranges. No
  screenshot sweeps, matrices, long reports or speculative refactors.
- **Small commits on `main`, no PRs.** One item per commit. `git pull --rebase origin main`, gate, commit, push. A broken
  `main` is fixed by the next commit. (PRs and reviews come back once real servers run nuikit.)
- **Say what's unproven in one line** ("not seen in game") and move on. The owner tests in game at checkpoints.

## Two ways of working

**Cloud sessions** (most work): take an item, work on `main` (a branch only when the item can't be green in one sitting),
run the gate, push, and end the turn with: what's in it, what needs an in-game check (3 lines), what's blocked.

**The owner's local session** (`C:\dev\nuikit`, junctioned into his Qbox server): works live in game, hot-reloading a system
(`pnpm --filter ./systems/<x>/web dev`) or deploying an addon (`pnpm build`, `.local\deploy.ps1`), and commits straight to
`main` when it's right. Practical notes below. Both pull with rebase before each item.

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

## Who owns what

Nobody owns files; the roadmap owns items. Two sessions on one item is the only thing to avoid: say in the commit what you
took. Synced copies (`web/src/index.css`, `web/src/components/ui/*`, `lib/`, `client/*.lua` copies) are never edited by hand:
change the source, `pnpm sync`. `registry.json` entries and `.changeset/*.md` are append-only.

## The gate (about a minute, before each push)

`pnpm typecheck`, the build of what you touched, `pnpm sync` clean. **Anything visual: `pnpm look <web dir> [url]` and Read the PNGs it writes (every theme) before you push; say in your report which you looked at.** A component that looks different under a theme in any way other than skew, wall, radius, fill style, palette or type is a bug: themes set values, never anatomy. Tests where there is real logic. For an override that
changes what it POSTs to its resource, a POST-log diff of its main flow (`bench/screens/run.mjs` + `diff.mjs`): that is the
one change that breaks servers. CI runs on `main` after the push (build, typecheck, tests, `nuikit check`); red means the next commit fixes it.

## Hard rules that stay (they protect players and licences)

- Overrides are **clean-room** and **protocol-exact**: implement from `docs/<name>-protocol.md`, never copy upstream code,
  markup or styles; POST payloads and timings match.
- Chromium 103 rules in `CLAUDE.md`. Presentation only (no gameplay).
- **Server-authoritative templates** (any block or template with server Lua is copied into real servers): never trust the
  page; validate types and ranges; check identity, permission, presence and distance on the server; move money and items
  atomically with rollback; rate-limit per player; never send identifiers to the page; Lua tests for each rule.
- Credit `@belibathan` only. Never print or commit secrets.

## Working on the owner's machine

- Repo `C:\dev\nuikit`; server data `C:\FXServer\txData\Qbox_D52860.base` (`server.cfg` holds secrets: never
  print). Systems are junctioned into the server; addons deploy with `.local\deploy.ps1` after `pnpm build`.
- **`systems/nuikit/theme.css` is locally modified** (the owner's private server palette; its source copy is in
  `.local/`): never commit it; `git stash push -- systems/nuikit/theme.css` around merges, and restore it from the
  `.local/` copy if lost. The committed stock is Default; `.local/theme-ink-server.css` is a backup of it.
- Live loop: `pnpm --filter ./systems/<x>/web dev` hot-reloads that page in game (the vite plugin rewrites
  `ui_page`, restored on exit); `.local\nk-restart.ps1 <resource>` restarts a resource via `nuikit_dev`.
  **Never queue `nuikit` or `ox_lib`** (refused: restarting them stops `nuikit_dev` mid-command and crashed
  FXServer). Those need the txAdmin console or a full restart.
- Full restart: txAdmin (owner logs in; the agent must not enter credentials) or stop/start `FXServer.exe` in a
  terminal tab. ox_lib/ox_target UI changes need a full restart.
- Don't use worktree isolation from a session whose cwd might be another repo: create worktrees explicitly with
  `git -C C:/dev/nuikit worktree add …`. Never touch the owner's private server repo.
- Credit `@belibathan` only. No server names (the private palette ships publicly only as "Neon Pop").
