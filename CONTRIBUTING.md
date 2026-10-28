# Contributing to nuikit

Thanks for helping make FiveM UI less painful. Bug reports, in-game screenshots and small focused PRs are all
welcome. By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

Node 20+ and pnpm 10.

```bash
pnpm install
pnpm build        # packages, registry, site
pnpm test         # unit tests
pnpm typecheck
pnpm proof        # renders shadcn in a real Chromium 103 and asserts the result
pnpm sync         # writes every UI's generated index.css and the Lua copies; components resolve from registry/ and vendor/
pnpm dev          # the website and playground at localhost:5173
```

## Layout

| Path | |
|---|---|
| `packages/core` | Runtime, tokens, intents, fonts and the Lua half. |
| `packages/vite` | Vite plugin and the Chromium 103 CSS compiler (`src/compat.ts`). |
| `packages/cli` | `nuikit check`. |
| `packages/create-nuikit` | `npm create nuikit` and its templates. |
| `registry/` | shadcn registry source: components in `registry/nuikit/ui`, blocks in `registry/nuikit/blocks`. |
| `systems/` | The `[nuikit]` resources: runtime, HUD, pause, death, loading, chat. |
| `addons/` | Clean-room overrides (ox_lib, ox_inventory, …). |
| `adapters/` | QBCore, ESX and standalone adapter packs. |
| `apps/www` | Website, playground and theme studio. |

## Rules that keep PRs mergeable

- **Clean-room overrides.** Write or update `docs/<name>-protocol.md` from the upstream resource, then implement
  from the spec. Never copy upstream code, markup or styles. Every callback payload must match the spec.
- **Tokens, not values.** Colours, radii, type and motion come from theme tokens (`docs/tokens.md`,
  `docs/design.md`). No `backdrop-filter`, no `color-mix()`, no `:has()`; motion is transform and opacity.
- **`nuikit check` stays at level 3** for every page (CI enforces it).
- **Keyboard and mouse** both work. Check 1280×720, 1920×1080 and 2560×1440.
- **Add a changeset** (`pnpm changeset`) for user-facing package changes.

## Found CSS that breaks in game?

That's the most valuable bug report. Open an issue with the classes or CSS, what you see in game (a screenshot
helps), and ideally a failing case in `packages/vite/test/compat.test.ts` or `examples/cef-proof/page.html`.

## Test a scaffold against your checkout

```bash
pnpm -r build
node packages/create-nuikit/dist/index.js my-test --yes --link "$(pwd)"
```
