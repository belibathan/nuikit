# vendor/shadcn

Unmodified [shadcn/ui](https://github.com/shadcn-ui/ui) components (new-york-v4, MIT, © shadcn), copied from
`apps/v4/registry/new-york-v4/ui/` (every component; `hooks/use-mobile.ts` into `hooks/`). The only change is the
import path for `cn`, sibling components (`@/components/ui/*`) and hooks (`@/hooks/*`).

Re-copy: clone shadcn-ui/ui and run `node scripts/vendor-shadcn.mjs <path to apps/v4/registry/new-york-v4>`.

Some components need npm packages no page here installs yet (`cmdk`, `vaul`, `embla-carousel-react`, `recharts`,
`react-hook-form`, `input-otp`, `react-resizable-panels`, `react-day-picker`, `@base-ui/react`, `@shadcn/react`):
add them to that page's `web/package.json` when it lists the component (`pnpm sync` warns when one is missing).
vaul's `Drawer` is modal even with `modal={false}`: use `Sheet side="bottom"` for trays (docs/design.md).

nuikit's registry components are compositions of these. Users get them through `registryDependencies`
(`npx shadcn add` installs them), and this copy is what the website and the `create-nuikit` template use.
Don't edit them here; re-copy from upstream instead.
