# cef-proof

Compiles a real shadcn/ui page with Tailwind v4, then renders it in **Chromium 103.0.5058** (the version FiveM's NUI runs, from `@sparticuz/chromium@103`). It renders once with stock CSS and once after `vite-plugin-nuikit`, then asserts computed styles: the button has a background, `bg-primary/15` is translucent primary, the `-translate-1/2` dialog is centered, `md:` breakpoints apply, and gradients render.

```bash
pnpm proof   # from the repo root
```

Writes `out/before.png`, `out/after.png`, `out/compare.png`. Runs in CI on every push.
