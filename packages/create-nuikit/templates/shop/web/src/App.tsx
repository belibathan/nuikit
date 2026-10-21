import { ShopSurface } from "@/components/blocks/shop/shop";
import { NuiToaster } from "@/components/ui/nui-toaster";

// The shop block (npx shadcn add @nuikit/shop). It's your code now: the catalogue, cart and
// checkout are in components/blocks/shop, its messages in components/blocks/shop/nui.ts, and
// client/main.lua + server/main.lua decide what's for sale and check every purchase. The toaster
// shows nk.notify() from Lua.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <ShopSurface />
      <NuiToaster />
    </main>
  );
}
