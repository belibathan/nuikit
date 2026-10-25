# Figma variables for the nuikit spec

The Figma file (`docs/design/figma.md`) mirrors the spec's levers as variables: three collections
(`nuikit · 1 identity`, `· 2 semantic`, `· 3 component`), modes **Default · Neon Pop · Flat · Square**.
The repo is the source; Figma is the reference. Regenerate and push whenever the spec changes:

```bash
pnpm --filter nuikit-core build                 # the spec → tokens.generated.ts
node bench/figma/gen.mjs && node bench/figma/emit.mjs   # → out/data-{identity,semantic,component}.json, out/fonts.json
node bench/figma/script.mjs                     # → out/figma-*.js, the paste-ready use_figma scripts
```

Then, in a session with Figma write access (the Figma MCP `use_figma` tool, or the Figma plugin console):

1. `out/figma-0-prepare.js`: renames the modes, removes the old "yours (Ember)" pair, lists stale variables.
2. `out/figma-1-identity.js`, `-2-semantic.js`, `-3-component-*.js` (component rows are sliced to stay under the
   script size cap): each creates or updates variables by name with scopes, descriptions, WEB code syntax and
   per-mode values; aliases resolve in the last script, `figma-4-aliases.js`.
3. `out/figma-5-prune.js`: removes variables that are no longer in the spec (listed by step 1; review before running).

Fonts the type variables name (`out/fonts.json`) must be available in the file (Geist, Barlow Condensed).
