import { ShopSurface } from "@/components/blocks/shop/shop";
import { NuiNotices } from "@/components/ui/notice";

// The shop block (npx shadcn add @nuikit/shop). It's your code now: the catalogue, cart and
// checkout are in components/blocks/shop, its messages in components/blocks/shop/nui.ts, and
// client/main.lua + server/main.lua decide what's for sale and check every purchase. <NuiNotices />
// shows nk.notify() from Lua.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <ShopSurface />
      <NuiNotices />
    </main>
  );
}
