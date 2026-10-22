# nuikit_dev

Test commands for a development server: open every nuikit UI without the real scripts. **Off by default**: with `nuikit_dev` unset the resource registers nothing and prints one line.

```cfg
setr nuikit_dev 1
ensure nuikit_dev     # needs nuikit and ox_lib started first
```

`/nk test` lists the options. `/nk test <what>` runs one on you only. Admin only: the player needs the ace `command.nuikit` (the one `/nuikit` uses, `add_ace group.admin command.nuikit allow` in `nuikit.cfg`). The server checks the ace, a fixed whitelist and a per-player rate limit, then tells your client what to open.

| What | Opens |
|---|---|
| `notify` `menu` `input` `confirm` `progress` `prompt` `target` `radial` `challenge` | the nuikit intent (`notify` shows each status and a merged toast, `progress` a bar and a ring) |
| `ox_notify` `ox_progress` `ox_input` `ox_alert` `ox_context` `ox_menu` `ox_skill` `ox_textui` `ox_radial` | the same through `lib.*`, so the ox_lib override page draws them (`ox_radial` adds items, then hold Z) |
| `all` | a short tour of the above, one after another |
| `items` | gives you an `id_card` (metadata from your qbx_core character, else placeholders), 2 `water` and 2 `burger` through ox_inventory. Once per 10 s. |

Not packed into `nuikit.zip`: copy `systems/nuikit_dev` by hand. Never enable it on a live server.
