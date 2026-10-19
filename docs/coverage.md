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
