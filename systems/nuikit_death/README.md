# nuikit_death

The death and last-stand screen for `[nuikit]`: a red vignette that pulses while you're down, a big countdown (bleed-out or respawn), and the keys your medical resource actually listens for, as shadcn `Kbd` hints. Built from stock shadcn components and themed by `nuikit/theme.css` (the red is the theme's `--destructive`).

**Presentation only.** Your medical resource still owns last stand, death, timers, EMS alerts and respawn. nuikit reads what it's doing and shows it; it never revives, respawns or alerts anyone, and it never takes NUI focus, so E and G keep reaching the medical resource.

## Install

1. Put it in `resources/[nuikit]/` next to the `nuikit` resource. Start it after your medical resource.
2. `ensure nuikit` then `ensure nuikit_death`.
3. Turn off the medical resource's own on-screen text if you don't want it twice (below).

## Medical resources

Picked automatically (`Config.medical = 'auto'`), in this order:

| Resource | Where the state comes from | Timers | Keys shown |
|---|---|---|---|
| **qbx_medical** (Qbox) | statebag `qbx_medical:deathState` (2 = last stand, 3 = dead) | live, from its exports `GetLaststandTime`, `GetDeathTime`, `GetRespawnHoldTimeDeprecated` | **G** request EMS, **E** hold to respawn (+ hospital bill) |
| **qb-ambulancejob** (QBCore) | player metadata `inlaststand` / `isdead` | mirrored from its `config.lua` from the moment the metadata changes (estimated: it keeps its timers in locals) | **G** request help, **E** hold to respawn (+ bill) |
| **esx_death** (current ESX) | its export `GetDeathState()` | live | **G** distress signal (with cooldown), **E** hold to respawn after the early-respawn timer |
| **esx_ambulancejob** (ESX before esx_death) | `esx:onPlayerDeath` / `esx:onPlayerSpawn` | mirrored from its `config.lua` (estimated) | **G**, **E** |
| none (standalone) | `IsEntityDead(PlayerPedId())` | none | none |

Timers and the bill are read from the medical resource's own config file at start (`laststandReviveInterval`, `deathTime`, `laststandTimer`, `checkInCost`, `Config.ReviveInterval`, `Config.BillCost`, `Config.EarlyRespawnTimer`, …), so your edits there show up here. `Config.fallback` is used only if a file can't be read.

**Qbox details**, mirrored from `qbx_ambulancejob/client/setdownedstate.lua`: "Request EMS (G)" is shown only while `qbx_ambulancejob` is running, at least one EMS is on duty (`server/main.lua` asks `qbx_core`'s `GetDutyCountType('ems')`, refreshed every minute like the original) and the bleed-out timer is at or below its `laststandTimer`. After G it reads "EMS have been notified" until you're revived. While dead with EMS on duty it shows the respawn countdown; otherwise "Hold E to respawn · $2,000" with a progress bar.

**The E bar** is nuikit's own measure of how long you've held E, in milliseconds, streamed to the page (`NUI.stream('death:hold')`, at most 30 updates a second) and painted every frame, so it fills smoothly. `qbx_medical` still decides when you respawn: its loop in `client/dead.lua` ticks once a second, counts `RespawnHoldTime` from 5 down to 1 on each tick that finds E held, and respawns on the tick that finds it at 1. That is the next tick after you press E plus four more, so nuikit times the bar to that tick (it sees the ticks as `GetDeathTime()` changing, which the same loop counts down). The same loop only looks at E on its ticks, so the bar does too. If you let go and press again between two ticks, `qbx_medical` never notices, and the bar keeps going. If a tick finds E up, `qbx_medical` starts its count again and the bar empties. The bar no longer reads `GetRespawnHoldTimeDeprecated`, which only moved in whole seconds. Respawn timing is unchanged.

**Hospital bed.** After a respawn, `qbx_ambulancejob` checks you into a bed and treats you for its `aiHealTimer` (20 s by default). You stay dead in `qbx_medical` (deathState 3) until the server revives you at the end, so the dead screen used to stay up over the treatment. nuikit now hides it while you're in the bed, and stops the screen effect. It detects the bed in two ways:

- the client events `qbx_ambulancejob:client:checkedIn` (respawn or check-in) and `qbx_ambulancejob:client:putPlayerInBed` (an EMS puts you in a bed), both sent by its server with `(hospitalName, bedIndex)`. These open a 10 s window for the fade to the bed;
- the bed animation from `client/hospital.lua` (`anim@gangops@morgue@table@`, `body_search`) playing on your ped, which also works if a bed is reached some other way.

If the animation stops while you're still dead, or it never starts within 10 s of the event, the dead screen comes back. While hidden you're still down: the `dead` state stays set (the pause menu stays blocked) and `isDown()` stays true. When the treatment ends, `qbx_medical` revives you and everything clears as usual.

## Duplicate text from the medical resource

nuikit keeps the bottom of the screen clear so the original text doesn't overlap, but you'll usually want only one. None of these resources has a config switch for it:

- **qbx_ambulancejob:** in `client/setdownedstate.lua`, comment out the `qbx.drawText2d(...)` calls in `displayRespawnText`, `handleRequestingEms` and `handleLastStand`. Keep the rest of those functions (the `IsControlJustPressed(0, 47)` check is what sends the EMS alert). `qbx_medical` draws nothing.
- **qb-ambulancejob:** in `client/dead.lua`, comment out the `DrawTxt(...)` lines inside the `if isDead` / `elseif InLaststand` blocks. Keep the `IsControlJustPressed(0, 47)` block.
- **esx_death:** it has its own full NUI death screen. To show only nuikit's, add `body { display: none !important; }` to the end of `esx_death/web/style.css`; its Lua (timers, E, G) keeps working. Its F2 cursor toggle would then focus an invisible page; press F2 again to release it.

## Also

- While you're down it sets the client-wide nuikit state `dead` (`'laststand'` or `'dead'`), so surfaces declared with `blockedBy = { 'dead' }` refuse to open, `nuikit_pause` included. It hides the nuikit HUD.
- `Config.effects` plays a GTA screen effect while downed (`DeathFailMPIn` once unconscious by default, nothing in last stand). CEF draws over the game, so CSS can't desaturate the world; GTA's effect does. Set to `false` to turn off.
- `Config.text` changes the titles. `exports.nuikit_death:isDown()` for other resources.
- `Config.band` (default `true`) draws the incapacitated band along the bottom edge: the state on the left, the phase and the clock on the right. It takes only the last 2.5rem of the screen, under the medical resources' own text; `false` leaves the whole bottom clear.

## Verified

- Lua logic in Lua 5.4 with mocked natives (`packages/core/test/lua/death.test.ts`): config parsing, the Qbox statebag/exports flow including when G counts, the E bar's streamed values against `qbx_medical`'s tick, hiding and restoring around the hospital bed, the QBCore mirrored timers, esx_death's export, standalone, and that the pause menu is blocked while down.
- UI: typecheck, build, and screenshots of every state in the browser.

## Check in game

- Qbox: the countdown matches `qbx_ambulancejob`'s drawn text second for second; "Request EMS" appears exactly when its prompt does; the E bar fills smoothly and is full when the respawn happens; the screen is gone during the hospital-bed treatment and back if the treatment is interrupted.
- QBCore and old ESX: how close the mirrored timers stay to the resource's own (they start when the metadata/event arrives).
- esx_death: the export's values and the CSS hide.
- `DeathFailMPIn` looks right on your build and stops on revive/respawn.

## Edit it

The UI is a normal Vite + React + shadcn app in `web/`. Components live in `web/src/components/ui`; the vignette and motion are in `web/src/death.css`.

```bash
cd web && npm install && npm run dev   # ?fixture=qbx-laststand, qbx-laststand-help, qbx-dead-hold, esx-dead, native…
npm run build                          # writes web/dist for the game
```

Made by [@belibathan](https://github.com/belibathan).
