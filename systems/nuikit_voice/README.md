# nuikit_voice

pma-voice in the vitals cluster: your voice range, radio channel and call join the HUD's vitals row as
[slots](../../docs/slots.md), so voice reads as part of one cluster with health, armour and the rest.

| Slot | Shows | Lit (`hue = success`) |
|---|---|---|
| `range` | pma-voice's proximity mode (Whisper, Normal, Shouting, Custom) | while you talk |
| `radio` | the channel (`3 MHz`) while you're on one | while you transmit |
| `call` | "In call" while you're in one | while you talk |

**Presentation only.** It reads pma-voice's player state (`proximity`, `radioChannel`, `radioActive`,
`callChannel`) and the talking native; it never calls or changes pma-voice. With pma-voice stopped it
leaves the cluster.

## Install

`ensure nuikit_voice` after `pma-voice` and `nuikit` (it is in `[nuikit]`). Turn slots off, or move them in
the row, in `config.lua` (`range`, `radio`, `call`: `show`, `order`).

nuikit_hud also has its own voice readout (`Config.voice`); once the HUD draws the vitals slots, set
`Config.voice = false` there so voice shows once. Not seen in game.

## License

MIT, by [@belibathan](https://github.com/belibathan). Reads pma-voice's public state; contains none of its code.
