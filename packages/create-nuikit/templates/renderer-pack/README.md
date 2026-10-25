# {{name}}

A [nuikit](https://github.com/belibathan/nuikit) renderer pack: it replaces how nuikit draws the `notify`
intent for every script on the server (`nk.notify`, and ox / QBCore / ESX notifications through the
adapters), still themed by the server's tokens and stacked by the runtime. No page of its own: nuikit's
frame loads `web/dist/renderers.js` and uses the renderers it exports.

```bash
cd web
{{pm}} dev        # browser preview with devtools (press `); ?fixture=notify opens a few
{{pm}} run build  # web/dist/renderers.js
```

**In game:** `ensure nuikit`, then `ensure {{name}}`; `/{{name}}_test` fires three notifications through
your renderer. If the pack fails to load, nuikit keeps its default renderer and F8 says why.

## Make it yours

- `web/src/renderers/notify.tsx` is the look. It gets the open intents of its kind and `ctx`
  (`ctx.cancel(id, "timeout")` when a notice ran out; `resolve` / `emit` for intents that answer).
  Fields: `NotifyProps` in `nuikit-core/intents` (docs/intents.md).
- Another intent: add `nuikit_renderer 'menu'` to `fxmanifest.lua` and a `menu` renderer to
  `web/src/renderers.tsx`. One pack may draw several kinds; several packs may draw one kind (the one
  started last wins).
- Keep colours on theme tokens, sizes in rem, and the kit's `nk-*` utilities (docs/design.md):
  `npx @belibathan/nuikit check web --level 3`.
