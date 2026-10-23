# Installing nuikit on a server

*Qbox, QBCore, ESX or standalone. One zip, one line in server.cfg, one console command for the overrides.
Status (Oct 23, 2026): the commands are built and unit-tested; `nuikit install` has not run on a live FXServer yet.*

## 1. The same five steps on every framework

1. **Download** `nuikit-<framework>.zip` from the [latest release](https://github.com/belibathan/nuikit/releases/latest)
   (`nuikit-qbox.zip`, `-qbcore`, `-esx`, `-standalone`). It is `nuikit.zip` plus a `server.cfg.snippet` for that framework.
2. **Copy `[nuikit]/` into `resources/`** as a real folder (not a junction or symlink). The adapter pack folder
   (`[nuikit-qb]`, `[nuikit-esx]`, `[nuikit-standalone]`), when the zip has one, goes next to it. If you have an older nuikit, delete the old
   `nuikit*` folders first, keeping a copy of `nuikit/theme.css`.
3. **server.cfg:** paste the snippet after the lines that start ox_lib and your framework (the per-framework lines are in §2).
   The one line that matters is `exec @nuikit/nuikit.cfg`: that file starts `nuikit` and every `[nuikit]` system by name and
   holds the settings (currency, locale, host). Edit it in `[nuikit]/nuikit/nuikit.cfg`, not in server.cfg.
4. **Start the server**, then in the server console (or txAdmin's live console):

   ```
   nuikit install --dry-run     # what would change, nothing written
   nuikit install               # merge the overrides into the resources you run
   refresh
   restart ox_lib               # … and every resource `nuikit install` names
   nuikit doctor                # should say: every [nuikit] system on nuikit, every override in place
   ```

5. **Theme:** paste any [TweakCN](https://tweakcn.com) export into `[nuikit]/nuikit/theme.css`, then `nuikit theme reload`.

**Verify the download.** Each release carries `SHA256SUMS.txt` next to the zips. In the folder you downloaded to,
run `sha256sum -c SHA256SUMS.txt` (Linux, macOS, Git Bash), or on Windows compare `certutil -hashfile nuikit-qbox.zip SHA256`
with the matching line in the file. A mismatch means the file is not the one released: download it again.

## 2. Per framework

What gets stopped are the stock screens a `[nuikit]` system replaces. Everything else keeps running; the overrides change
only the UI files of resources you already have.

### Qbox

```cfg
ensure ox_lib
ensure [qbx]
ensure pma-voice
exec @nuikit/nuikit.cfg
stop qbx_hud            # nuikit_hud (+ nuikit_stress keeps stress)
stop loadscreen         # nuikit_loading
stop qbx_chat_theme     # nuikit_chat
```

Qbox starts resources by category, so the `stop` lines go after `ensure [qbx]`. No adapter pack: the ox_lib override
covers ox_lib and everything built on it. Overrides that fit Qbox: ox_lib, ox_inventory, ox_target, ox_doorlock,
qbx_scoreboard, qbx_idcard, qbx_taxijob, qbx_vehiclesales, illenium-appearance, mm_radio, Renewed-Banking.
`nuikit install` skips any you don't run.

### QBCore

```cfg
ensure ox_lib
ensure qb-core
ensure pma-voice
exec @nuikit/nuikit.cfg
stop qb-hud             # nuikit_hud
stop qb-loading         # nuikit_loading
ensure [nuikit-qb]      # the QBCore adapter pack (qb-menu, qb-input, qb-notify… drawn by nuikit)
```

Overrides that fit: ox_lib (if you run it), ox_inventory, ox_target, ox_doorlock, illenium-appearance, mm_radio,
Renewed-Banking. Not yet tested on a QBCore server (the owner runs Qbox); `nuikit doctor` reports what it finds.

### ESX

```cfg
ensure ox_lib
ensure es_extended
ensure pma-voice
exec @nuikit/nuikit.cfg
stop esx_hud            # nuikit_hud
stop esx_loadingscreen  # nuikit_loading
ensure [nuikit-esx]     # the ESX adapter pack (esx_menu_default, esx_notify… drawn by nuikit)
```

Overrides that fit: as for QBCore. Not yet tested on an ESX server.

### Standalone

```cfg
ensure ox_lib           # optional; the ox_lib override needs it
exec @nuikit/nuikit.cfg
ensure [nuikit-standalone]  # the standalone adapter pack (okokNotify, mythic_notify stand-ins drawn by nuikit)
```

`nuikit_hud` and `nuikit_pause` show what the bridge can read without a framework (health, armour, vehicle, voice).
No stop lines. The `[nuikit-standalone]` pack only matters if you run okokNotify or mythic_notify; if you run neither,
delete its folder and the `ensure` line. Not yet tested on a standalone server.

## 3. What `nuikit install` does

The zip ships every override under `[nuikit]/nuikit/overrides/<resource>/<ui folder>/`, and `overrides.json` next to
it with a hash of every file. For each resource that exists on the server (`GetResourcePath`, running or not):

| It finds | It does |
|---|---|
| a file the resource has and we ship (the stock UI) | copies it to `<resource>/.nuikit-backup/<version>/`, then writes ours |
| a file the resource doesn't have | adds it |
| our own file from an older zip | updates it (the stock backup from the first install stays) |
| our file, **edited by you** since | keeps it and says so; `--force` writes ours and saves your edit to `.nuikit-backup/<version>.edited/` |
| a file we shipped before and no longer do | restores the stock copy, or removes it if the resource never had it |

Then it writes `<resource>/.nuikit-backup/manifest.json` (nuikit version, every file it owns with its hash) and prints one
line per resource plus the `restart` lines. Files the resource keeps next to its UI (images, fonts) are never touched: it
merges, it doesn't replace the folder.

```
nuikit install [resource…] [--dry-run] [--force]
nuikit upgrade [resource…] [--dry-run] [--force]     the same command, the word for after a new zip
nuikit uninstall [resource…]                        restore the stock files from the backup, remove ours
```

Console only (it writes to disk); players with `command.nuikit` get a message saying so.

## 4. Upgrading

1. Download the new zip, replace `resources/[nuikit]/` (keep your `nuikit/theme.css` and `nuikit/nuikit.cfg`; diff them
   against the new ones for new settings).
2. `restart nuikit`, then `nuikit upgrade`, `refresh`, restart what it names.
3. `nuikit doctor`. An override installed by an older nuikit shows as `override 0.8.0, outdated` until you upgrade it;
   one you edited shows as `override edited` (info, not a warning) and is left alone unless you pass `--force`.

Updating one of the overridden resources itself (ox_lib, ox_inventory…) restores its stock UI. `nuikit doctor` then says
`override missing`; run `nuikit install <resource>` again.

## 5. Uninstalling

`nuikit uninstall` puts every overridden resource back the way it was (the backup folder is emptied as files are
restored; the `.nuikit-backup/` folder itself stays, delete it when you like). Then remove the `exec @nuikit/nuikit.cfg`
line and the `stop` lines from server.cfg, and delete `resources/[nuikit]/`.

## 6. txAdmin

`install/recipe-qbox.yaml` is a txAdmin recipe for a **new** Qbox server. It is from 0.7.0, untested on a real txAdmin,
and still leaves the overrides for you to install (`nuikit install` once the server is up). Treat it as a starting point.

## 7. If something is off

`nuikit doctor` ([doctor.md](doctor.md)) lists every resource with a UI, what nuikit did for it and a next step, and
`nuikit doctor json` gives the same as one line for a bug report. Not seen in game yet: `GetResourcePath` from a server
script on every host (it is documented server-side), Node's `fs` under FXServer's JS runtime (it is Node), and txAdmin
file permissions on Linux hosts where the server user doesn't own `resources/`.
