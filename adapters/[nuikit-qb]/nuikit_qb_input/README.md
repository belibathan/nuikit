# nuikit_qb_input

Replaces **qb-input** (stop it). `ShowInput(data)` blocks and returns `{ [name] = value }` or `nil`; `CloseMenu()` returns `nil` to the waiting caller. Draws with nuikit's input renderer.

server.cfg: `ensure [nuikit-qb]`; `stop qb-input`.

Guesses until a recording says otherwise (`Config` in client/main.lua): number fields return numbers; a checkbox group returns the list of checked values. Spec: `docs/adapters/qb-input.md`.
