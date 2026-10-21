# What nuikit covers on a Qbox server

Every resource in the official Qbox recipe (`qbox.yaml`), and how its interface gets the nuikit look.
Most Qbox resources draw nothing themselves: they call ox_lib (menus, dialogs, progress, notifications,
text prompts, skill checks, radial), so **the ox_lib override themes all of them at once**.

| How | Resources |
|---|---|
| **ox_lib override** (`overrides/ox_lib`) | qbx_garages, qbx_mechanicjob, qbx_customs, qbx_vehicleshop, qbx_management, qbx_cityhall, qbx_pawnshop, qbx_properties, qbx_adminmenu, qbx_ambulancejob, qbx_police, qbx_radialmenu, qbx_smallresources, qbx_core (multicharacter, notifications), qbx_vehiclekeys, qbx_seatbelt, every qbx job (bus, garbage, news, taxi, tow, trucker, recycle, vineyard, diving, scrapyard), robberies, drugs, weed, ox_fuel, ox_doorlock prompts, scully_emotemenu, xt-prison, vehiclehandler, Renewed-Weathersync |
| **[nuikit] system** (replaces a resource) | `nuikit_hud` → qbx_hud · `nuikit_loading` → loadscreen · `nuikit_pause` → GTA pause menu · `nuikit_death` → qbx_medical's death/last-stand text · `nuikit_stress` keeps qbx_hud's stress gameplay · `nuikit_chat` → qbx_chat_theme |
| **Override** (new UI, same Lua) | ox_inventory, ox_target, illenium-appearance (character creator, clothing, barber, tattoos), qbx_scoreboard, qbx_idcard, Renewed-Banking, mm_radio, qbx_taxijob meter, qbx_vehiclesales contract |
| **Not yet** | npwd (phone) and its apps, qbx_police fingerprint scanner, qbx_lapraces, minigames (mhacking, ultra-voltlab, safecracker, bank/store robbery panels), ox_doorlock admin UI |
| **No UI** | pma-voice (audio only), oxmysql, MugShotBase64, screencapture, bob74_ipl, mana_audio, pillbox, qbx_density, qbx_vehicles, qbx_invimages, qbx_npwd, qbx_binoculars, qbx_streetraces |
| **GTA's own look** (scaleform, not NUI) | qbx_spawn (heist-style map), GTA's native pause map and settings |

Frameworks: the systems read player data through `bridge.lua`, so they also run on QBCore, ESX and
standalone. The ox_lib override works on any server that runs ox_lib.

## In-game checklists (0.7.1 Screens rebuilds, unproven in game)

Browser-checked only (`bench/screens/<name>`: POST logs identical before and after, screenshots at 1280×720, 1920×1080, 2560×1440). Verify on a Qbox server:

**qbx_scoreboard**
1. Press the scoreboard key: a panel at the right shows players / slots with a thin bar and every activity with a dot and a word (Available, In progress, Unavailable).
2. Set an activity busy (`exports.qbx_scoreboard:SetActivityBusy('bankrobbery', true)`) and open again: amber dot, "In progress".
3. With no police on duty, every activity reads Unavailable (hollow dot); with enough, green and Available.
4. Release the key (or press again in toggle mode): the panel fades out in about 100 ms; no cursor appears at any point.

**qbx_idcard**
1. Use an ID card item: the card shows beside the right edge with the mugshot, name, card type and place, citizen ID, date of birth, sex and nationality; a "Backspace · Put it away" prompt under it.
2. Show it to a nearby player: they see the same card; a job badge (if configured) shows left of it with the grade as a chip.
3. Press Backspace: the card closes and the game gets its keys back (walk, open the pause menu).
4. With `autoClose.status = true` in `config/shared.lua`, the card closes on its own after `time` ms.
5. Driver, weapon and lawyer cards each keep their configured colour as a line on the card's top edge.

**mm_radio**
1. Use the radio item: the panel slides in at its saved spot; header shows the clock, signal, battery and street; the joined frequency is the big number; the member overlay shows who's talking.
2. Channels → Recommended → pick one: it joins (notify on the header's second line); Radio → type `88.5` on the keypad or keys, Join; dial above `Shared.MaxFrequency` is refused.
3. Members: mute a player (icon fills), Hide/Show overlay, Settings → switch Move radio, drag the panel, Save: the position and call sign survive a reopen.
4. Volume: drag the slider and let go (one "Volume set to N%" notify), mute toggles; the keypad still ignores keys while typing the call sign.
5. Esc puts the radio away; walking in a jammer zone shows "Jammed"; a flat battery shows the no-charge screen.
