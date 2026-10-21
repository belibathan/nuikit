# qb-core DrawText → `prompt`

*Clean-room spec. Written from [qbcore.org/docs/qb-core/drawtext](https://qbcore.org/docs/qb-core/drawtext).
Mechanism proposed; the spike decides.*

**Status (Oct 21):** listener built as `adapters/[nuikit-qb]/nuikit_qb_drawtext` (one prompt, id `drawtext`, replaced on DrawText; `KeyPressed` hides after 500 ms); replay test `bench/adapters/replay/qb/qb-core.test.mjs`. Exports: forwarded by the silencer page in `nuikit_qb_notify/override` as `nuikit_qb:page`; the mapping (`action` containing DRAW/CHANGE/HIDE/KEY, `text`/`message`, `position`) is a guess to replace from a recorded log. Not run in game.

## Source

Documented: the four exports, the four events, positions `left` / `right` / `top` (lowercase in examples), the
`KeyPressed` animation (then hides after ~500 ms). **Not documented**: the key hint markup scripts put in the
message (e.g. `[E] Open` or HTML), whether `DrawText` while shown replaces or ignores, qb-core's page message
format for the text UI.

## Public API

| Call | Event equivalent | Args |
|---|---|---|
| `exports['qb-core']:DrawText(message, position?)` | `qb-core:client:DrawText` | `message` string, `position` `'left' \| 'right' \| 'top'` (default left) |
| `exports['qb-core']:ChangeText(message, position?)` | `qb-core:client:ChangeText` | same |
| `exports['qb-core']:HideText()` | `qb-core:client:HideText` | none |
| `exports['qb-core']:KeyPressed()` | `qb-core:client:KeyPressed` | none; plays the pressed animation, hides ~500 ms later |

Events are triggered with `TriggerEvent` (client) or `TriggerClientEvent(…, source, …)` (server). Nothing is
returned; one text at a time.

## Intent and field mapping

`prompt` (architecture §2: persistent key hint; keys, label, hold-to-confirm, multiple).

| DrawText | `prompt` |
|---|---|
| `message` | `label`; a leading `[X]` / `~INPUT_…~` token → `keys = ['X']` and stripped from `label` (the renderer draws keys) |
| `position` | `position` (`left` / `right` / `top`) |
| `ChangeText` | `update(promptId, { label, keys, position })` |
| `HideText` | `cancel(promptId)` |
| `KeyPressed` | `update(promptId, { pressed: true })`; the adapter cancels after 500 ms |

## What the intent must cover

- A `pressed` state (the key lights up) and a position on the left, right or top.
- Labels with no key (plain text UI) and labels whose key is parsed from the text.
- A single prompt that is replaced, not stacked, when drawn again (DrawText's model), alongside the kit's own
  multi-prompt use.

## Mechanism

**Listener** for the four events + **page override** of qb-core's page for the exports (the exports are inside
qb-core: no stand-in possible). The override page forwards the text messages to `https://nuikit/intent` and draws
nothing, which also silences qb-core's drawing for the event path. Same dependence on the spike as
[`qb-core-notify.md`](qb-core-notify.md): step 7 (cancel reach) and step 8 (cross-resource post). The page's
message format comes from a recorded `SendNUIMessage` log.

## Replay test

Recording: `DrawText('[E] Open garage', 'left')`, `ChangeText('[E] Close', 'right')`, `KeyPressed`, `wait 600`,
`HideText`; then the event forms.

1. One `prompt` opened with `keys = ['E']`, `label = 'Open garage'`, `position = 'left'`.
2. `ChangeText` updated the same prompt (no second open).
3. `KeyPressed` set `pressed`, and the prompt was cancelled ~500 ms later without `HideText`.
4. `HideText` with nothing shown did nothing.
5. Event forms matched export forms.
