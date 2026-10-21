# nuikit_qb_menu

Replaces **qb-menu** (stop it; `provide 'qb-menu'` resolves dependencies here). `openMenu` / `closeMenu` / `showHeader`, exports and the `qb-menu:client:*` events, draw with nuikit's menu renderer; selections dispatch exactly as qb-menu documents (client/server event, command, QB command, `action`).

server.cfg: `ensure [nuikit-qb]` after `exec @nuikit/nuikit.cfg`; `stop qb-menu` (or delete it).

Stays with the library: nothing (qb-menu is only UI). Spec: `docs/adapters/qb-menu.md`.
