# Your language in an hour

A nuikit server gets its own design language from one file of values. No component edits, no rules: the kit reads
levers (custom properties) and draws what they say. This page walks the levers in the order that moves the look
fastest. Do it next to the [theme studio](/theme), which applies every step live to every component, shows your diff against
the theme you started from, and exports only what you changed. The full catalog, with defaults and ranges, is
[levers.md](levers.md); the token reference is [tokens](../tokens.md).

**The proof:** Default, Neon Pop, [Flat](../../packages/core/themes/flat.css) and [Square](../../packages/core/themes/square.css) are
four different languages from the same components, each one a file of values. The strip at the bottom of the studio shows them side by side.

## 0:00 Pick a start (5 min)

Open the studio and click the shipped theme closest to what you want. Everything in `packages/core/themes/*.css` is
there: Default (slanted keycaps on hard plates), Neon Pop, Graphite, Signal, Velvet, Vector, Arcade, Street, Studio,
Flat (quiet, rounded, upright) and Square (zero radius, 1px rims, mono numerals). Starting near is faster than starting blank.
Or paste a TweakCN theme for the palette and layer the levers on top.

### Start from the CLI

The same start, from a terminal: `npx nuikit theme new my-server --from flat` writes `theme.css`, a file of values in
`@layer nk.theme { .dark { … } }` with the chosen theme's values set and every other lever commented out, with its
default and range (`/* --nk-tile-skew: nk-skew  (-20deg..20deg) */`). Uncomment a line to change that lever; the file compiles
with no warnings. `nuikit theme --list` names the shipped themes; the default `--from` is `graphite`, the kit's baseline.

## 0:05 Treatment (5 min)

`--nk-treatment: soft | glass | plate | slab | tile` is a named set of lever values: the cheapest big move. `soft` is
empty (the blank page), `glass` is deep shadow and blur, `plate` is chamfers and scanlines, `slab` is heavy hairlines and
slanted italics, `tile` is Default's keycaps. A treatment only fills what your file leaves out, so any lever you set wins.
Pick one, then change only what you disagree with.

## 0:10 Colour (10 min)

The semantic colours: `--background`, `--foreground`, `--primary`, `--brand`, the status colours, the HUD surface.
The studio warns when a pair fails contrast; those are the warnings your server console prints too. Fix them now, not in game.

## 0:20 Geometry (10 min)

The shape of everything, by value.

| Lever | What it does | Try |
|---|---|---|
| `--nk-skew`, `--nk-tile-skew` | Slant of chips and badges, and of keycap faces (text stays upright) | `0deg` calm, `-12deg` fast |
| `--nk-tile-wall` | How far a keycap's face sits above its plate | `0rem` flat, `0.1875rem` default |
| `--nk-r-key`, `--nk-r-chip`, `--nk-r-control`, `--nk-r-surface` | Radii of keys, chips, buttons and rows, panels | all `0px` for Square, `0.5rem`+ for friendly |
| `--nk-cut` | Chamfered corners | `0.5rem` for plates |
| `--nk-border-width` | Hairline weight | `1px`, `2px` for slab |

Change the radii as a set; mixed radii read as an accident.

## 0:30 Type voices (10 min)

Five roles: `scan` (keys, buttons, tabs), `title`, `label`, `num`, `body`. Each has `--nk-type-<role>-{family,style,weight,tracking,case}`.
First set the families (`--font-sans`, `--font-display`, `--font-numeric`), then give the roles a personality:
italic uppercase `scan` is arcade, upright sentence case everywhere is Flat, mono `num` is Square. Numbers
are tabular regardless; tracking matters more on uppercase than on sentence case.

## 0:40 Fills (5 min)

`--nk-fill-style: solid | soft` decides how meters, progress and the selected row read: vivid and full, or a translucent tint.
`--nk-tile-tint` sets the soft opacity. `--nk-hold-style` (bar, ring, fill) and `--nk-level-style` (bar, ring, liquid, slab, pips)
decide how a hold-to-confirm and a level draw.

## 0:45 Selection and focus (5 min)

`--nk-row-indicator` (bar, fill, outline, sweep) is how the lit row announces itself; `--nk-row-lift` steps it out.
`--nk-focus-style` (ring, halo, tint, fill, invert, bar) is everything else that takes focus; `--nk-focus-shift` nudges
the focused part. This is the choice players feel most with a controller: make the selected row unmistakable.

## 0:50 Motion (5 min)

`--nk-motion-feel` (crisp, snap, smooth, stepped) and `--nk-duration` (the compiler warns above 260ms) set the pace;
`--nk-exit-factor` makes exits faster than entrances, `--nk-confirm-scale` is the pop on confirm, `--nk-rise` the entrance
distance. Premium is subtle: shorter and quieter than your first instinct.

## 0:55 Ship it (5 min)

Download **Only what you changed**. It is values only, in `@layer nk.theme`:

```css
@layer nk.theme {
  .dark {
    --nk-treatment: slab;
    --nk-r-control: 0px;
    --nk-tile-skew: -6deg;
  }
}
```

Put it after the base theme in `nuikit/theme.css` (or use **Download theme.css** for the full compiled file),
run `nuikit theme reload`, and check it in game. `nuikit check` warns `theme/values-only` if a rule slips in. If you need a rule,
a lever is missing: say so in an issue.

Made with [@belibathan](https://github.com/belibathan)'s nuikit.
