# Contributing to nuikit

Thanks for helping make FiveM UI less painful.

## Setup

```bash
pnpm install
pnpm build        # packages, registry, site
pnpm test         # unit tests (core runtime + CSS compat compiler)
pnpm proof        # renders shadcn in a real Chromium 103 and asserts the result
pnpm dev          # the website / playground at localhost:5173
```

## Layout

| Path | |
|---|---|
| `packages/core` | Runtime (`src/`) and the Lua half (`lua/nuikit.lua`). |
| `packages/vite` | Vite plugin, CSS compat compiler (`src/compat.ts`), `nuikit-doctor`. |
| `packages/create-nuikit` | CLI + resource template. `scripts/sync-template.mjs` copies the Lua runtime, registry components and theme into it. Don't edit the copies. |
| `registry/` + `registry.json` | shadcn registry source. `pnpm registry:build` writes `apps/www/public/r`. |
| `apps/www` | Website and live playground. |
| `examples/cef-proof` | The Chromium 103 render test. |

## Test a scaffold against your checkout

```bash
pnpm -r build
node packages/create-nuikit/dist/index.js my-test --yes --link "$(pwd)"
```

## Found CSS that breaks in game?

That's the most valuable bug report. Open an issue with:

1. the Tailwind classes or CSS,
2. what you see in game (a screenshot helps),
3. ideally a failing case added to `packages/vite/test/compat.test.ts` or `examples/cef-proof/page.html`.

## Components

Registry components must:

- use **only** shadcn tokens (`bg-card`, `text-muted-foreground`, `chart-1..5`…), no raw colors;
- avoid `:has()`, container queries and other Chromium 105+ features;
- work with keyboard and mouse;
- stay one file, copy-paste readable.

## Releases

We use [changesets](https://github.com/changesets/changesets): `pnpm changeset` in your PR describes the change.
