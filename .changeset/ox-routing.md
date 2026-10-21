---
"nuikit-ox-lib-ui": minor
---

ox_lib override: notify, context and list menus, the input dialog, the alert, progress bar and circle, text UI and the skill check are routed to the `nuikit` resource's frame (`https://nuikit/intent`) and drawn by the shared, themed renderers in one stack with one focus owner, so a server's renderer pack restyles ox_lib too. Convar `nuikit_ox_route` (default on); without nuikit, or when the door refuses, the page draws locally as before. Every POST back to ox_lib is unchanged (`bench/screens/ox_lib`). Mapping and what's unproven in game: `docs/adapters/ox-lib.md`.
