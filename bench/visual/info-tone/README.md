# `info`: follows `primary` or a fixed blue?

For the owner's open item in `docs/roadmap.md`. Two sheets from the site's `/components` page, stock neutral theme,
1920×1080, identical except `--info`: `node bench/visual/info-tone/shots.mjs` regenerates them.

| Sheet | `--info` | `--info-foreground` | info-foreground on info |
|---|---|---|---|
| `primary-1920x1080.jpg` (today) | `rgb(229, 229, 229)` = `--primary` | `rgb(23, 23, 23)` | 13.9:1 |
| `blue-1920x1080.jpg` | `rgb(59, 156, 246)` = `oklch(0.68 0.16 250)` (the armor blue, `docs/tokens.md`) | `rgb(23, 23, 23)` (derived: primary-foreground) | 6.5:1 |

Where it shows: the Notice bar for "Vehicle stored" / "Fleeca" and the "Download" meter. Band and slabs don't use
`info` in the stock set (shown for context).

Comparison, not a decision:

1. **Grey (today)** keeps the stock theme at three status hues (green, amber, red): an info notice is "neutral",
   as the token doc says, and never fights `primary` for attention. Cost: info and a default notice look the same
   at a glance; only the icon tells them apart.
2. **Fixed blue** reads as the fourth status colour every player already knows (ox_lib's stock `info` icon is blue), so
   a notice's kind is clear from the bar alone. Cost: a fourth hue in a theme whose author set none; on a themed
   server (Signal, Velvet) the blue may clash unless the theme sets `--info` itself.
3. Either way an explicit `--info` in `theme.css` wins; the question is only the derived default.
4. If blue: derive it like success/warning (at destructive's lightness and chroma, hue 250) so it sits in the set.
5. If grey stays: consider `--info` = `--muted-foreground` tint for the bar so info is at least distinguishable
   from a tone-less notice.
