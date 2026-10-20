---
"create-nuikit": minor
---

Start from a block: `npm create nuikit@latest my-hud -- -t hud-minimal` (or `-t death-screen`, or pick from a list) scaffolds a whole screen from the registry with its Lua (`@nuikit/init.lua`, `nk.surface`, `nk.stream`). The first two blocks are also in the registry (`npx shadcn add https://nuikit.vercel.app/r/hud-minimal.json`, `…/death-screen.json`). New projects now depend on the nuikit-core and vite-plugin-nuikit of the same release instead of 0.2.
