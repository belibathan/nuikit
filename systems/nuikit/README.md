# nuikit

The core of `[nuikit]`. It holds one file that themes every nuikit UI on your server:

- **`theme.css`**: paste any [TweakCN](https://tweakcn.com) or [shadcn theme](https://ui.shadcn.com/themes) here (the `:root` and `.dark` blocks). Every `[nuikit]` resource, and every resource built with nuikit, picks it up the next time its UI loads. `restart` the UI resources, or reconnect, to see a change.

Start it before the other `[nuikit]` resources:

```cfg
ensure nuikit
ensure [nuikit]
```
