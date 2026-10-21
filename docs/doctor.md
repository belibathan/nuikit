# nuikit doctor: the server tells you what's left

*`nuikit doctor` in the server console. Plan step 8 of [`architecture.md`](architecture.md) §6. Status:
built and unit-tested against hand-made snapshots; **not yet run on a live server** (see §6).*

## 1. What it reports

```
nuikit doctor         the report below
nuikit doctor json    the same report as one JSON line (for txAdmin, scripts, bug reports)
```

Console only, or players with the ace `command.nuikit` (the same ace as `nuikit theme`). Other server
scripts get the report as an object from `exports.nuikit:doctor()`.

| Section | What it says | Where it comes from |
|---|---|---|
| Runtime | nuikit's version and protocol; the newest release when known | `nuikit`'s fxmanifest; convar `nuikit_latest` |
| Framework | Qbox, QBCore, ESX or standalone | `qbx_core`, `qb-core`, `es_extended` started (`GetResourceState`), in that order |
| Adapter packs | for each of `[nuikit-ox]`, `[nuikit-qb]`, `[nuikit-esx]`: running, fits (not installed), fits but **not shipped yet**, or not needed | a table in `packages/core/src/doctor.ts`; "running" when a started resource declares `nuikit_adapter '<library>'` |
| Resources with a UI | every started resource with `ui_page`, `loadscreen`, `nuikit_ui` or `chat_theme`, with its status and a next step | fxmanifest metadata; the page file for overrides |
| Findings | conflicts and problems, each with a next step in plain words | §2 |
| Intents | how many intents each resource drew since start, by intent | the `nuikit:intent` event, §4 |

Resource statuses:

| Status | Means | Detected by |
|---|---|---|
| `on nuikit v<p> level <l>` | speaks the protocol | `nuikit_protocol '<p>'`; `nuikit_level '<l>'` (new, optional: the level `nuikit check` gave the page) |
| `on nuikit (hosted)` | a module in nuikit's frame | `nuikit_ui` |
| `on nuikit (loadscreen)`, `on nuikit (theme)` | nuikit's own loading screen (it runs before the runtime, so no handshake) and chat theme (no page: `chat_theme`) | a `nuikit_*` resource with `loadscreen` or `chat_theme` and no `nuikit_protocol`. Another loading screen or chat theme next to them is `untouched` with "stop it" as the next step |
| `adapted (<resource>)` | a running adapter draws its UI calls | another started resource declares `nuikit_adapter '<this resource>'` (reserved for the packs) |
| `override` | its page is one of ours | the page at `ui_page` carries `<meta name="nuikit-handshake" content="off">` (protocol §5.6). `(override changed)` / `(override missing)` when `overrides.json` disagrees, §3 |
| `untouched` | its own UI, nothing of nuikit in it | none of the above |

## 2. Findings

| Code | Severity | When | Next step it prints |
|---|---|---|---|
| `provide-conflict` | error | a started resource declares `provide 'X'` and `X` is started too | stop one of them |
| `start-order` | error | a resource that imports `@nuikit/` or depends on `nuikit` was already started when nuikit's server script ran | `ensure nuikit` earlier, restart the resource |
| `protocol-newer` | error | `nuikit_protocol` higher than the runtime's | update nuikit |
| `override-missing` | warn | `overrides.json` lists a page for a started resource and the file has no marker (a library update put the stock UI back) | copy the override again |
| `override-drifted` | warn | the page has the marker but its hash isn't the shipped one | copy the override again unless you edited it |
| `manifest-changed` | warn | a started resource's `fxmanifest.lua` on disk differs from when it started (hash on `onResourceStart`); a new `files` entry isn't served until then | `refresh`, then `restart <resource>` |
| `missing-dependency` | warn | imports `@nuikit/init.lua` without `dependency 'nuikit'` | add the line |
| `theme-contrast` | warn | one of the compiled theme's contrast checks fails (the same checks `nuikit theme` prints) | which two tokens to change, then `nuikit theme reload` |
| `theme-warning` | info | other compiler warnings (missing dark set, values FiveM can't read) | fix in theme.css |
| `update-available` | info | `nuikit_latest` is newer than the running version | the release URL |
| `framework` | info | always: what was detected and which packs fit | the packs that fit |

Errors first, then warnings, then info; the same finding never prints twice (a failed contrast pair is one `theme-contrast`, not that plus the compiler's own warning line). The start-order check only sees resources that were started
*before* nuikit's server script ran; once a resource restarts (`onResourceStart`) it is cleared.

## 3. Extension points

Everything registers through fxmanifest metadata or a file; no code calls into the doctor.

- **Adapter packs.** A pack's resource declares `nuikit_adapter 'ox_lib'` (one line per library it draws for).
  The library then shows as `adapted`, the pack as `running`, and `provide 'ox_lib'` (if the pack is a stand-in)
  is checked against the real library. The table of known packs (`ADAPTER_PACKS` in `doctor.ts`: name, library,
  frameworks, shipped) is the one place to flip `shipped: true` when a pack ships.
- **Conformance level.** A nuikit UI declares `nuikit_level '3'` next to `nuikit_protocol`; the value is what
  `nuikit check` reports for the page. Optional; the doctor asks for it when missing.
- **Override hashes: `overrides.json`.** Shipped inside the `nuikit` resource by the pack step:

  ```json
  { "version": "0.6.0", "overrides": { "ox_lib": { "path": "web/build/index.html", "hash": "3f9c1a2b" } } }
  ```

  `path` is the replaced resource's `ui_page`; `hash` is `pageHash(html)` from nuikit-core (FNV-1a 32-bit over
  the built page, line endings normalised). The doctor loads the live page with `LoadResourceFile` and compares.
  **Not wired yet:** `scripts/pack-systems.mjs` doesn't write the file (lead's lane; the diff is in the PR).
  Without the file, the marker check still runs and the hash checks are skipped.
- **Newest release.** `set nuikit_latest 0.7.0` in server.cfg makes the doctor compare. No network calls are made;
  `nuikit_check_updates 1` is reserved for an opt-in online check and prints that it isn't built yet.
- **Intent counts.** §4.

## 4. Intent counts (`nuikit:intent`)

The intents runtime emits one event per intent drawn, `{ source, intent }` (source: the resource that asked;
intent: `notify`, `menu`, `input`, …), as a server event (`TriggerEvent` on the server) or from a client
(`TriggerServerEvent`). The doctor counts them per source since nuikit started; `nuikit doctor` prints the
totals, biggest source first. This is the live half of the coverage number: with the scripted session in
[`../bench/coverage/`](../bench/coverage/README.md) it says what share of a server's UI calls nuikit draws.

Until the intents lane emits the event, the section prints "none counted yet".

## 5. Sample output

```
nuikit 0.6.0 (protocol 1), latest 0.7.0
framework: qbox (qbx_core)
adapter packs:
  [nuikit-ox]    fits, not shipped yet
  [nuikit-qb]    not needed (qb-core isn't running)
  [nuikit-esx]   not needed (es_extended isn't running)
resources with a UI (6): 2 on nuikit, 0 adapted, 2 override, 2 untouched
  ox_lib                   override (override changed)
  ox_target                override (override page)
  ox_inventory             untouched (override missing)
                             → copy overrides/ox_inventory/ from nuikit.zip back over resources/ox_inventory/
  nuikit_pause             on nuikit v1 level 3
  nuikit_hud               on nuikit v1
                             → declare nuikit_level '<1-3>' from `nuikit check` so the doctor can show it
  my_garage                untouched
                             → its UI is its own; add nuikit_protocol to join (docs/protocol.md) or wait for an override
findings: 1 error, 4 warnings
  ERROR my_garage started before nuikit; its @nuikit import failed on that start
        → put `ensure nuikit` before `ensure my_garage` in server.cfg, then `restart my_garage`
  WARN  ox_lib: the override page at web/build/index.html isn't the one nuikit 0.6.0 shipped (edited, or from another release)
        → if you didn't edit it, copy overrides/ox_lib/ from nuikit.zip over resources/ox_lib/ and `restart ox_lib`
  WARN  ox_inventory: the nuikit override page isn't at web/build/index.html (a library update replaced it, or it was never copied)
        → copy overrides/ox_inventory/ from nuikit.zip over resources/ox_inventory/ again and `restart ox_inventory`
  WARN  my_garage imports @nuikit/init.lua but doesn't declare `dependency 'nuikit'`
        → add `dependency 'nuikit'` to its fxmanifest.lua so FiveM starts nuikit first
  WARN  theme: muted-foreground on muted is 3.10:1 (min 4.5:1)
        → lighten or darken `--muted-foreground` or `--muted` in nuikit/theme.css, then `nuikit theme reload`
  INFO  nuikit 0.6.0 is running; 0.7.0 is out
        → download nuikit.zip from github.com/belibathan/nuikit/releases/tag/v0.7.0 and replace [nuikit]/ and overrides/
  → adapter packs that fit: [nuikit-ox] (not shipped yet)
intents drawn since start (by source):
  ox_lib                   53  (notify 41, menu 12)
  qbx_garages              3  (menu 3)
```

## 6. Where it lives, and what's unproven

- `packages/core/src/doctor.ts`: `doctor(snapshot)` → report, `formatDoctor(report)` → lines, `pageHash`,
  `ADAPTER_PACKS`. Pure; tested in `packages/core/test/doctor.test.ts` (Qbox, QBCore, ESX, standalone, every
  finding). Bundled into `systems/nuikit/server/compiler.js` with the theme compiler (`pnpm sync`).
- `systems/nuikit/server/doctor.js`: builds the snapshot from natives (`GetNumResources`,
  `GetResourceByFindIndex`, `GetResourceState`, `GetNumResourceMetadata`/`GetResourceMetadata`,
  `LoadResourceFile`, `GetConvar`), counts `nuikit:intent`, prints. Tested in `doctor-server.test.ts` with fake
  natives.
- `systems/nuikit/server/main.js` routes `nuikit doctor [json]` to it and hands over the compiled theme.

Unproven in game (the natives are used as documented, but nothing here has run on FXServer yet):

1. `GetResourceMetadata` for `shared_script` / `client_scripts` plural and singular keys: FXServer stores both
   forms under the key as written in the manifest; the glue asks for all six. If the plural form is stored
   differently, `missing-dependency` and `start-order` miss resources that use it.
2. `GetResourceState` of a resource at the moment nuikit's server script runs: the start-order check assumes a
   dependent that is already `started` then started first. With `ensure` ordering that holds; with txAdmin
   restarts it's unverified.
3. `LoadResourceFile` on another resource's built page (relative to that resource) and its size: fine for
   `ox_lib`'s ~100 KB page; untested for very large bundles.
4. `on("nuikit:intent")` and `onNet("nuikit:intent")` on the same name in one script.
5. Colour codes (`^1`, `^3`, `^5`) through `emitNet("chat:addMessage")` when a player runs `/nuikit doctor`.

In-game checklist (Qbox test server):

1. Start the server with nuikit from this build. In the console: `nuikit doctor`. Expect `framework: qbox (qbx_core)`,
   `[nuikit-ox] fits, not shipped yet`, every `[nuikit]` system `on nuikit v1`, `ox_lib` as `override` if the
   override is installed, everything else `untouched`.
2. `nuikit doctor json`: one JSON line, `framework: "qbox"`.
3. Put `ensure nuikit_pause` *before* `ensure nuikit` in server.cfg, restart the server, `nuikit doctor`: expect
   `ERROR nuikit_pause started before nuikit`. `restart nuikit_pause`, run again: gone.
4. In `theme.css` set `--muted-foreground` close to `--muted`, `nuikit theme reload`, `nuikit doctor`: expect the
   `theme:` warning with the two tokens. Revert.
5. In game, `/nuikit doctor` as admin: the report arrives in chat; as a non-admin: the permission message.
