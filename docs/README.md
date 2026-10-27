# nuikit docs: where to look

*Current* docs describe the code on `main` and are kept up to date. *Reference* docs are stable specs the code was
built from. Superseded docs are deleted, not archived: git has them.

## Start

| Doc | What | Status |
|---|---|---|
| [`roadmap.md`](roadmap.md) | **The one tracker**: released, where we are, the 0.9 plan, unmerged work | Current |
| [`next/handoff.md`](next/handoff.md) | Where everything stood on Oct 23, 2026: state, the philosophy, open bugs, the owner's screenshots | Current (dated snapshot) |
| [`next/dispatch.md`](next/dispatch.md) | How the agents work: the stance, lanes and file ownership, the gate, the design rule | Current |
| [`next/decisions.md`](next/decisions.md) | The design-call log (default + switch per decision) | Current, append-only |
| [`../fivem-foundation/AGENTS.md`](../fivem-foundation/AGENTS.md) | **The Lua standard** (fivem-foundation, a submodule): workflow, hard rules, pitfalls; `STANDARDS.md` §1–§26 behind it. [`next/foundation-gaps.md`](next/foundation-gaps.md) is nuikit's audit against it | Current |
| [`packages/core/src/spec/api`](../packages/core/src/spec/api) → [`arsenal.json`](../packages/core/arsenal.json), site `/kit` | **The arsenal, the API's source of truth**: every domain (`nk.<domain>.<verb>`, `nuikit-core/<domain>`, `nuikit:<domain>:<event>`), its entries, events, rules, old names; generates the entry points, `lua/api.lua`, the event types, `/kit` and the `nuikit check` arsenal rules (`pnpm --filter nuikit-core arsenal`) | Current |
| [`vision.md`](vision.md) | Why nuikit exists and what it is for | Reference |
| [`architecture.md`](architecture.md) | The target design: runtime, intents, adapters, renderers, services, doctor (the 0.7 plan, built) | Reference |

## Using nuikit

| Doc | What | Status |
|---|---|---|
| [`coverage.md`](coverage.md) | What nuikit covers on a Qbox server, and the in-game checklists | Current |
| [`install.md`](install.md) | Server owners: install per framework, `nuikit install` / `upgrade` / `uninstall` for the overrides | Current |
| [`doctor.md`](doctor.md) | `nuikit doctor`: what it checks and says | Current |
| [`settings.md`](settings.md) | `nk.settings` and the pause Settings page | Current |
| [`images.md`](images.md) | The image resolver (`https://nuikit/images`, `/vehicle`) | Current |
| [`adapters/`](adapters/README.md) | The adapter packs, one page per adapted library; [`framework-sdk.md`](adapters/framework-sdk.md) for your own framework | Current |
| [`releases/`](releases/) | Release notes per version (`v0.9.0.md` is the latest); older notes are in git history | Current / historical |

## Building on nuikit

| Doc | What | Status |
|---|---|---|
| [`protocol.md`](protocol.md) | The standard (v1): manifests, handshake, surfaces, Escape, theme, prefs, conformance levels | Reference (stable) |
| [`intents.md`](intents.md) | `nk.notify` … `nk.challenge`: the intent shapes and renderers | Current |
| [`services.md`](services.md) | `nk.camera`, `nk.controls`, surfaces | Current |
| [`slots.md`](slots.md) | Slots: how a resource adds to the HUD's clusters | Current |
| [`tokens.md`](tokens.md) | Tokens (revision 1.7): tiers, the DTCG file, the theme pipeline, prefs | Current |
| [`host.md`](host.md) | The one-frame host prototype and its measurements | Reference (opt-in) |
| [`pause-3d.md`](pause-3d.md), [`loadscreen-events.md`](loadscreen-events.md) | The pause menu's 3D map; loading-screen events | Current |
| `*-protocol.md` | Clean-room specs of each overridden resource's page protocol (ox_lib, ox_inventory, ox_target, …) | Reference (per override) |

## Design

| Doc | What | Status |
|---|---|---|
| [`design.md`](design.md) | **The one design doc**: principles, tokens and levers, scale and layout, surfaces, the baseline, the component network, the checklist, naming, how to check it | Current |
| [`design/levers.md`](design/levers.md) | The lever catalog, generated from `packages/core/src/spec` | Current (generated) |
| [`brand/`](brand/README.md), [`assets/`](assets/) | The mark, avatar and site images | Current |
