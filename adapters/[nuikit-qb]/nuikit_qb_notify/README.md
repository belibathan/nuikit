# nuikit_qb_notify

Listens to **QBCore:Notify** (client and server events) and draws it with nuikit's notify renderer; qb-core keeps running. Direct `QBCore.Functions.Notify` calls go to qb-core's own page: copy `override/html/index.html` over qb-core's `html/index.html` to silence it and forward those messages here (message shape unverified; `nuikit_debug 1` prints them).

server.cfg: `ensure [nuikit-qb]`. Without the page copy, event-path notifications draw twice (qb-core's and nuikit's).

Stays with the library: everything else in qb-core. Spec: `docs/adapters/qb-core-notify.md`.
