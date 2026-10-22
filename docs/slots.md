# Cluster slots (`NUI.slot`)

*A cluster (the HUD's vitals row) shows slots that other resources join (voice, radio, a job), so independent
resources read as one cluster. Rides the same local state bag as [screen zones](protocol.md); source:
`packages/core/lua/nuikit.lua` (Lua), `packages/core/src/slots.ts` + `useSlots` (pages).*

## Join (any resource with the runtime)

```lua
local talk = NUI.slot('vitals', 'talk', { order = 50, icon = 'mic', hue = 'info', label = 'Voice', level = 0 })
talk.set({ level = 0.7, alert = false })   -- change-only: no write when nothing changed
talk.set({ hidden = true })                -- keep the slot, draw nothing
talk.remove()                              -- leave the cluster
```

`order` (default 100, lower first) and whatever the cluster draws: `label`, `icon`, `hue` (a [role](tokens.md#foundation-14)),
`level` (0–1, its meaning is the slot's own), `value`, `alert`, `hidden`. `key` and `resource` are fixed. A stopped
resource leaves every cluster it joined. `NUI.slots()` reads the whole set.

## Draw (the cluster's page)

```tsx
import { useSlots } from "nuikit-core/react";

const slots = useSlots("vitals"); // ordered by order, then resource, then key; hidden ones left out
slots.map((s) => <VitalChip key={`${s.resource}:${s.key}`} data-hue={s.hue} icon={s.icon} level={s.level} />);
```

Every nuikit page gets `nuikit:slots { [cluster]: { ["resource:key"]: slot } }` on every change and on
`nuikit:ready`. Cluster names in use: `vitals` (nuikit_hud). Unproven: not seen in game.
