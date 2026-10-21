# nuikit_qb_drawtext

Listens to **qb-core:client:DrawText / ChangeText / HideText / KeyPressed** and draws them with nuikit's prompt renderer (`[E] Open` becomes a key chip). The `exports['qb-core']:DrawText` forms reach qb-core's page: the silencer page in `../nuikit_qb_notify/override` forwards them (mapping unverified).

server.cfg: `ensure [nuikit-qb]`.

Stays with the library: everything else in qb-core. Spec: `docs/adapters/qb-drawtext.md`.
