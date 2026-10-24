# nuikit_skins

Skins: the server's theme on resources nuikit doesn't override yet, without rewriting them. A skin is one
small CSS file that re-points a resource's own CSS variables (or a few of its selectors) at the server
theme, so its page takes your colours, radius and font next to every nuikit screen.

**Looks only.** A skin never changes what a page does: no keys, listeners, focus or posts. When the
`nuikit` resource isn't running there is no theme, so no skin is added and the page stays as it ships.

## Install a skin

1. Put `nuikit_skins` in `resources/[nuikit]/` (it is in `nuikit.zip`).
2. Add one line to the resource's page, at the end of `<head>` (keep a copy of the original file):

   ```html
   <script src="https://cfx-nui-nuikit_skins/skin.js" data-skin="qb-menu"></script>
   ```

3. `restart` that resource. `nuikit theme reload` repaints it live, like every nuikit UI.

| Skin | Resource | Page to edit |
|---|---|---|
| `qb-menu` | [qbcore-framework/qb-menu](https://github.com/qbcore-framework/qb-menu) | `html/index.html` |
| `pma-voice` | [AvarianKnight/pma-voice](https://github.com/AvarianKnight/pma-voice) (its call, radio and range readout, on by default: `voice_enableUi`) | `ui/index.html` |

Updating the resource restores its stock page; add the line again afterwards.

## How it works

`skin.js` is nuikit_chat's `theme.js`, the same file (a test keeps them identical). It asks the `nuikit`
resource for the compiled server theme (`https://nuikit/theme`, any page may), sets every token on the
page's `<html>` as `--nk-<name>` (colours as `rgb()`, plus `--nk-<name>-rgb` channels; Chromium 103 can't
read `oklch()`), loads the theme's fonts, and keeps a long-poll open so theme reloads repaint live. Once the
theme is on the page, it adds `skins/<data-skin>.css` after the page's own styles.

The `--nk-` prefix keeps the theme from colliding with a page's own variables (many pages define their
own `--primary`).

## Write a skin

Read the resource's page for the variables and class names it styles with, then map them, one line each,
keeping the page's own value as the fallback:

```css
:root {
  --their-accent: var(--nk-primary, #e11d48);
  --their-radius: var(--nk-radius, 8px);
}
```

Prefer re-pointing variables over restyling selectors: it survives the resource's own updates. Restyle a
selector only when the page has no variable for it, and keep to colour, border, radius, font and spacing.
Never hide, move or reorder controls a player uses. Write it from what the page does, not by copying its
stylesheet.

Tokens (all optional): `--nk-background`, `--nk-foreground`, `--nk-primary`, `--nk-primary-foreground`,
`--nk-secondary`, `--nk-muted`, `--nk-muted-foreground`, `--nk-accent`, `--nk-popover`, `--nk-card`,
`--nk-line-width`, `--nk-ring`, `--nk-destructive`, `--nk-scrim`, `--nk-radius`, `--nk-font-sans`, and every
colour's `-rgb` channels for translucency (`rgba(var(--nk-popover-rgb), 0.85)`). The full list is
[`docs/tokens.md`](../../docs/tokens.md).

## License

MIT, by [@belibathan](https://github.com/belibathan). Skins are written against each resource's public page;
they contain none of its code or styles.
