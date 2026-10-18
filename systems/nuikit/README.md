# nuikit

The core of `[nuikit]`. It holds one file that themes every nuikit UI on your server.

## theme.css

Paste any [TweakCN](https://tweakcn.com) or [shadcn theme](https://ui.shadcn.com/themes) into `theme.css`. **Paste the whole export as-is**: `:root`, `.dark` and the `@theme inline` block are all fine; nuikit reads the variables it needs and ignores the rest. Every `[nuikit]` resource, every resource built with nuikit and the nuikit ox_lib UI pick it up the next time their UI loads. `restart` those resources, or reconnect, to see a change.

What the theme controls: every colour (`primary`, `accent`, `card`, `chart-1`…`chart-5` for HUD bars), `radius`, shadows and fonts.

**Fonts.** nuikit doesn't bundle fonts (the stock ox_lib UI shipped Roboto; the nuikit replacement doesn't). The theme's `--font-sans` is used if the player's machine can load it; otherwise the system sans-serif is used. To guarantee a font, put an `@import` from Google Fonts as the first line of `theme.css`:

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap");
```

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
