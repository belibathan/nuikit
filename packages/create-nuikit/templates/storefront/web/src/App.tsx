import { StorefrontSurface } from "@/components/blocks/storefront/storefront";
import { NuiNotices } from "@/components/ui/notice";

// The storefront block (npx shadcn add @nuikit/storefront). It's your code now: the counter, cart
// and Manage tab are in components/blocks/storefront, its messages in components/blocks/storefront/nui.ts,
// and client/main.lua + server/main.lua decide what's on sale and check every purchase and every
// manage action. <NuiNotices /> shows nk.notify() from Lua.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <StorefrontSurface />
      <NuiNotices />
    </main>
  );
}
