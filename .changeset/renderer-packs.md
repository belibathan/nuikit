---
"nuikit-core": minor
"create-nuikit": minor
---

Renderer packs (docs/intents.md §9). A resource that declares `nuikit_renderer 'notify'` (one line per intent) and ships a module built with `nuikitModule()` whose default export is a renderer (`defineReactRenderer`) or a record of them replaces nuikit's default renderer for that intent, still themed by the server's tokens and stacked by the runtime; the newest started pack wins a kind, a stopped one hands back, and a pack that fails to load falls back to the default with an F8 line. `nuikit-core/host`: `host.fetchModule()` loads a module script for its exports without mounting it, `hoist()` is exported. `npm create nuikit -- -t renderer-pack` scaffolds a pack with a notify renderer on `notice`, a browser preview and `/<name>_test`.
