# nuikit

The core of `[nuikit]`. It holds one file that themes every nuikit UI on your server, compiles it,
and keeps each player's UI preferences.

## theme.css

Paste any [TweakCN](https://tweakcn.com) or [shadcn theme](https://ui.shadcn.com/themes) into `theme.css`. **Paste the whole export as-is**: `:root`, `.dark` and the `@theme inline` block are all fine. At start the server compiles it into the [nuikit tokens](../../docs/tokens.md) (UIs run in dark mode, so `.dark` is what players see), prints any problems in the server console, and sends the result to every player: every `[nuikit]` resource, every resource built with nuikit, the overrides (ox_lib, ox_inventory…), the chat and the loading screen.

```
[nuikit] theme compiled: tokens v1, 42 values, dark set, 8/9 contrast checks pass (3f2a91c0)
[nuikit] primary-foreground on primary is 2.1:1 (needs 4.5:1); text on buttons will be hard to read.
```

**Edit, then `nuikit theme reload`** in the server console: open UIs repaint right away, no restarts. `nuikit theme` shows the contrast checks again. Admins can run it in game as `/nuikit theme reload` with the ace `command.nuikit`:

```cfg
add_ace group.admin command.nuikit allow
```

What the theme controls: every colour, `radius`, shadows and fonts. nuikit adds what game UIs need on top (success/warning/info colours, the dark surface behind HUD chips, the HUD vitals' colours, a UI scale) and derives them from your theme when it doesn't set them: see [tokens v1](../../docs/tokens.md). To pick them yourself, add e.g. `--vital-health: oklch(0.65 0.22 25);` or `--nk-scale: 1.1;` to the `.dark` block.

**Fonts.** The four identities' fonts ship with nuikit: open-licence (SIL OFL) woff2 files such as Inter,
Geist Mono and Fraunces, bundled into each UI, so a theme that names them works offline. Any other font in
`--font-sans` / `--font-display` / `--font-numeric` is used if the player's machine has it; to guarantee one,
put an `@import` as the first line of `theme.css`. Details: [tokens, fonts](../../docs/tokens.md#fonts).

## Player preferences

Each player can set, for every nuikit UI at once: `/nuikit scale 1.1` (0.85–1.25), `/nuikit motion off`, `/nuikit contrast on`, `/nuikit reset`. Saved on their machine. Scripts: `NUI.prefs.get()` / `NUI.prefs.set({ scale = 1.1 })` (nuikit.lua) or `exports.nuikit:getPrefs()` / `setPrefs()`.

## Start order

`[nuikit]` reads data from your framework and ox_lib, so start them first. For Qbox:

```cfg
ensure ox_lib
ensure [qbx]        # qbx_core and friends (without qbx_hud if you use nuikit_hud)
ensure pma-voice
ensure nuikit
ensure [nuikit]
```

QBCore and ESX are the same with `qb-core` / `es_extended` in place of `[qbx]`.
