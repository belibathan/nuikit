# Framework adapter template

`nuikit_framework_example` is a copy-and-edit starting point for putting **your own framework** behind
nuikit (`usePlayer()`, the HUD, the shops, the identity pages), without editing nuikit. Contract and the full
table: [`docs/adapters/framework-sdk.md`](../../docs/adapters/framework-sdk.md).

It runs as is against a fake in-memory framework: `ensure nuikit` then `ensure nuikit_framework_example`, and
`/example_cash 500` moves the cash on every nuikit page.

## What to replace

1. Rename the folder and `name` in `fxmanifest.lua`; keep the `nuikit_framework '<name>'` line.
2. In `client.lua`, replace the **FAKE FRAMEWORK** block with reads from your framework and map them in
   `nuikitGetPlayer` (job, gang, money, needs, character).
3. Fire a local client event when your framework changes (or list your framework's own events in
   `nuikitEvents`), or push fields with `TriggerEvent('nuikit:framework:update', { ... })`.
4. Delete the `/example_cash` demo command.

A custom adapter wins over qbx_core, qb-core and es_extended. To force a built-in instead, set the convar
(`set nuikit_framework "qbcore"`).
