# {{name}}

A FiveM NUI resource made with [nuikit](https://github.com/belibathan/nuikit).

```bash
cd web
{{pm}} dev        # browser: hot reload + devtools (press `)
{{pm}} run build  # production build into web/dist
```

**In game:** add `ensure {{name}}` to your `server.cfg`. While `dev` is running, `ui_page` points at the dev server, so every save hot-reloads in game. Open the menu with `/{{name}}` or F7.

## Add components

Stock shadcn and the nuikit registry both work, and both render correctly in FiveM's Chromium 103:

```bash
npx shadcn add dialog tabs                 # anything from ui.shadcn.com
npx shadcn add @nuikit/speedometer         # game components
```

Icons come from `@/components/ui/icons` (Hugeicons; stock shadcn's `lucide-react` imports resolve to it). Text uses
the `nk-text-*` styles. Change the theme by pasting any [TweakCN](https://tweakcn.com) theme into `web/src/index.css`;
in game the server's `nuikit/theme.css` repaints it.

## Files

| | |
|---|---|
| `client/main.lua` | Your Lua: `nk.surface.define` (focus, Escape, open and close), `nk.message.send` / `nk.message.on` |
| `fxmanifest.lua` | Imports the nuikit runtime: `shared_script '@nuikit/init.lua'` (needs the `nuikit` resource running) |
| `web/src/nui.d.ts` | Types for every event and callback, shared by both sides |
| `web/src/dev.tsx` | Fake payloads for browser development |
| `web/src/App.tsx` | Your UI |
