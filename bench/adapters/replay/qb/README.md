# Replay tests: [nuikit-qb]

```bash
node --test bench/adapters/replay/qb/*.test.mjs      # one file per adapter (qb-core.test covers notify + drawtext)
```

`qb.mjs` adds to `../harness.mjs`: a stand-in `nuikit` runtime that records every intent (validated with the
real schema) and answers like `systems/nuikit/client/intents.lua` (busy, replace, cancel → resolved); a
coroutine model (CreateThread / Wait / promise / Citizen.Await) so a blocking export (`ShowInput`) can be
replayed; `play()` with the player's steps (`resolve`, `dismiss`, `intentEvent`, `frames`, `thread`) on top of
the recording format in `../README.md`. Recordings are hand-written from the libraries' docs until one is
recorded in game. Not part of `pnpm test` (no workspace package here; see the PR's Requests).
